import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TileData, TractorState } from '../types/game';

interface FarmViewport3DProps {
  tiles: TileData[][];
  tractor: TractorState;
  extraTractors?: TractorState[];
  isTitleScreen: boolean;
  selectedTile: { x: number; z: number } | null;
  onSelectTile: (coord: { x: number; z: number }) => void;
}

// Pre-allocated scratch math helpers outside the render loop (Zero GC)
const _targetPos = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();

const TRACTOR_BODY_COLORS = [0xd99226, 0x2e86de, 0x28b463, 0xc0392b];

export const FarmViewport3D: React.FC<FarmViewport3DProps> = ({
  tiles,
  tractor,
  extraTractors = [],
  isTitleScreen,
  selectedTile,
  onSelectTile,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    tiles,
    tractor,
    extraTractors,
    isTitleScreen,
    selectedTile,
    onSelectTile,
  });

  useEffect(() => {
    stateRef.current = {
      tiles,
      tractor,
      extraTractors,
      isTitleScreen,
      selectedTile,
      onSelectTile,
    };
  }, [tiles, tractor, extraTractors, isTitleScreen, selectedTile, onSelectTile]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 2. Scene, Sky Color & Matching Horizon Fog
    const skyColor = new THREE.Color(0x73899b);
    const scene = new THREE.Scene();
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x73899b, 0.011);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera & Damped OrbitControls (supports huge island expansion up to 28x28)
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      220
    );
    camera.position.set(0, 11.5, 11.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minPolarAngle = 0.22;
    controls.minDistance = 5;
    controls.maxDistance = 80;
    controls.target.set(0, 0.2, 0);

    // 4. Balanced 3-Point Outdoor Daylight Rig
    const hemiLight = new THREE.HemisphereLight(0xc8e3f8, 0x8b6239, 0.85);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff3d1, 1.85);
    sunLight.position.set(16, 28, 18);
    sunLight.castShadow = !isSoftwareGl;
    const d = 22;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 85;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x9ec4e8, 0.55);
    rimLight.position.set(-14, 10, -14);
    scene.add(rimLight);

    // 5. Procedural Textures
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const createPlowedSoilTexture = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#5c3c22';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#422915';
      for (let y = 8; y < 128; y += 16) {
        ctx.fillRect(6, y, 116, 7);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAnisotropy;
      return tex;
    };

    const createContactShadowTexture = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
      grad.addColorStop(0, 'rgba(15, 20, 25, 0.65)');
      grad.addColorStop(0.6, 'rgba(15, 20, 25, 0.25)');
      grad.addColorStop(1, 'rgba(15, 20, 25, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const plowedTex = createPlowedSoilTexture();
    const shadowTex = createContactShadowTexture();

    // Shared Materials Library
    const mats = {
      islandGrassRim: new THREE.MeshStandardMaterial({ color: 0x6b8e2e, roughness: 0.85, metalness: 0.05 }),
      islandSoilBlock: new THREE.MeshStandardMaterial({ color: 0xc28340, roughness: 0.9, metalness: 0.04 }),
      islandDeepEarth: new THREE.MeshStandardMaterial({ color: 0x9c622b, roughness: 0.95, metalness: 0.03 }),
      cliffAccent: new THREE.MeshStandardMaterial({ color: 0x807972, roughness: 0.88, metalness: 0.1, flatShading: true }),
      tileWild: new THREE.MeshStandardMaterial({ color: 0x729632, roughness: 0.85, metalness: 0.05 }),
      tilePlowed: new THREE.MeshStandardMaterial({ map: plowedTex, roughness: 0.92, metalness: 0.02 }),
      tileMud: new THREE.MeshStandardMaterial({ color: 0x4b331d, roughness: 0.25, metalness: 0.15 }),
      tileStationPad: new THREE.MeshStandardMaterial({ color: 0x64686d, roughness: 0.6, metalness: 0.2 }),
      wheatStalk: new THREE.MeshStandardMaterial({ color: 0xe2b84b, roughness: 0.65, metalness: 0.05 }),
      wheatGreen: new THREE.MeshStandardMaterial({ color: 0x84b038, roughness: 0.7, metalness: 0.05 }),
      carrotOrange: new THREE.MeshStandardMaterial({ color: 0xed7424, roughness: 0.55, metalness: 0.05 }),
      carrotLeaf: new THREE.MeshStandardMaterial({ color: 0x4ca632, roughness: 0.65, metalness: 0.05 }),
      cornStalk: new THREE.MeshStandardMaterial({ color: 0x5c9c30, roughness: 0.72, metalness: 0.04 }),
      cornCob: new THREE.MeshStandardMaterial({ color: 0xf5c73d, roughness: 0.45, metalness: 0.08 }),
      woodTrunk: new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.88, metalness: 0.04 }),
      woodCrown: new THREE.MeshStandardMaterial({ color: 0x4f7d28, roughness: 0.78, metalness: 0.05, flatShading: true }),
      tractorTrim: new THREE.MeshStandardMaterial({ color: 0x658b1e, roughness: 0.4, metalness: 0.25 }),
      tractorChassis: new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.72, metalness: 0.65 }),
      tractorTire: new THREE.MeshStandardMaterial({ color: 0x1e2022, roughness: 0.88, metalness: 0.1 }),
      tractorHub: new THREE.MeshStandardMaterial({ color: 0xe8b948, roughness: 0.38, metalness: 0.5 }),
      tractorGlass: new THREE.MeshPhysicalMaterial({
        color: 0xd9f0ff,
        roughness: 0.1,
        metalness: 0.1,
        transmission: isSoftwareGl ? 0 : 0.8,
        transparent: true,
        opacity: isSoftwareGl ? 0.45 : 0.9,
      }),
      headlightGlow: new THREE.MeshStandardMaterial({
        color: 0xfff5cc,
        emissive: 0xffd966,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      }),
      pumpRed: new THREE.MeshStandardMaterial({ color: 0xc93b2b, roughness: 0.35, metalness: 0.4 }),
      barnWood: new THREE.MeshStandardMaterial({ color: 0x9e3828, roughness: 0.75, metalness: 0.1 }),
      barnRoof: new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 0.6, metalness: 0.2 }),
      selectionRing: new THREE.MeshBasicMaterial({
        color: 0xe8c95a,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    };

    // Shared Geometries for High-FPS Large Island Rendering
    const sharedTileGeo = new THREE.BoxGeometry(0.96, 0.08, 0.96);
    const sharedWheatStalkGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.68, 5);
    const sharedCarrotRootGeo = new THREE.ConeGeometry(0.07, 0.22, 7);
    const sharedCarrotLeafGeo = new THREE.ConeGeometry(0.09, 0.24, 5);
    const sharedCornStalkGeo = new THREE.CylinderGeometry(0.032, 0.042, 0.78, 7);
    const sharedCornCobGeo = new THREE.CapsuleGeometry(0.055, 0.14, 4, 8);
    const sharedWoodTrunkGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.42, 7);
    const sharedWoodCrownGeo = new THREE.DodecahedronGeometry(0.28, 0);

    // 6. World Hierarchy Groups
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    const tilesGroup = new THREE.Group();
    scene.add(tilesGroup);

    const cropsGroup = new THREE.Group();
    scene.add(cropsGroup);

    const selectGeo = new THREE.RingGeometry(0.42, 0.48, 4);
    selectGeo.rotateX(-Math.PI / 2);
    selectGeo.rotateY(Math.PI / 4);
    const selectMesh = new THREE.Mesh(selectGeo, mats.selectionRing);
    selectMesh.position.y = 0.06;
    selectMesh.visible = false;
    scene.add(selectMesh);

    // 7. Factory to Build Up to 4 Composite 12-Part Procedural 3D Tractors
    interface TractorRig {
      root: THREE.Group;
      chassisGroup: THREE.Group;
      wheels: THREE.Group[];
      implements: Record<string, THREE.Group>;
      currentYaw: number;
    }

    const createTractorRig = (bodyColorHex: number): TractorRig => {
      const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyColorHex,
        roughness: 0.32,
        metalness: 0.35,
      });

      const root = new THREE.Group();
      scene.add(root);

      const contactShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 1.35),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.55,
        })
      );
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.02;
      root.add(contactShadow);

      const chassisGroup = new THREE.Group();
      root.add(chassisGroup);

      const chassisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.82), mats.tractorChassis);
      chassisMesh.position.set(0, 0.22, 0);
      chassisMesh.castShadow = !isSoftwareGl;
      chassisMesh.receiveShadow = !isSoftwareGl;
      chassisGroup.add(chassisMesh);

      const hoodShape = new THREE.Shape();
      hoodShape.moveTo(-0.21, 0);
      hoodShape.lineTo(0.21, 0);
      hoodShape.lineTo(0.18, 0.26);
      hoodShape.lineTo(-0.18, 0.26);
      hoodShape.closePath();
      const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
        depth: 0.42,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2,
      });
      const hoodMesh = new THREE.Mesh(hoodGeo, bodyMat);
      hoodMesh.position.set(0, 0.28, -0.02);
      hoodMesh.castShadow = !isSoftwareGl;
      chassisGroup.add(hoodMesh);

      const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.05), mats.tractorTrim);
      grilleMesh.position.set(0, 0.4, 0.42);
      chassisGroup.add(grilleMesh);

      const cabinGroup = new THREE.Group();
      cabinGroup.position.set(0, 0.3, -0.22);
      chassisGroup.add(cabinGroup);

      const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.46), bodyMat);
      roofMesh.position.set(0, 0.48, 0);
      roofMesh.castShadow = !isSoftwareGl;
      cabinGroup.add(roofMesh);

      const windshieldMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.38), mats.tractorGlass);
      windshieldMesh.position.set(0, 0.24, 0);
      cabinGroup.add(windshieldMesh);

      const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.2), mats.tractorChassis);
      seatMesh.position.set(0, 0.12, -0.05);
      cabinGroup.add(seatMesh);

      const exhaustMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 0.42, 10),
        mats.tractorChassis
      );
      exhaustMesh.position.set(0.18, 0.56, 0.22);
      exhaustMesh.castShadow = !isSoftwareGl;
      chassisGroup.add(exhaustMesh);

      const hlGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12);
      hlGeo.rotateX(Math.PI / 2);
      const hlLeft = new THREE.Mesh(hlGeo, mats.headlightGlow);
      hlLeft.position.set(-0.18, 0.38, 0.44);
      const hlRight = new THREE.Mesh(hlGeo, mats.headlightGlow);
      hlRight.position.set(0.18, 0.38, 0.44);
      chassisGroup.add(hlLeft, hlRight);

      const wheels: THREE.Group[] = [];
      const buildWheel = (radius: number, width: number, xPos: number, zPos: number) => {
        const wGroup = new THREE.Group();
        wGroup.position.set(xPos, radius, zPos);

        const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
        tireGeo.rotateZ(Math.PI / 2);
        const tire = new THREE.Mesh(tireGeo, mats.tractorTire);
        tire.castShadow = !isSoftwareGl;
        wGroup.add(tire);

        const hubGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 12);
        hubGeo.rotateZ(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, mats.tractorHub);
        wGroup.add(hub);

        const lug = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.03, radius * 0.9, 0.04),
          mats.tractorChassis
        );
        wGroup.add(lug);

        chassisGroup.add(wGroup);
        wheels.push(wGroup);
      };

      buildWheel(0.24, 0.16, -0.32, -0.22);
      buildWheel(0.24, 0.16, 0.32, -0.22);
      buildWheel(0.16, 0.12, -0.28, 0.3);
      buildWheel(0.16, 0.12, 0.28, 0.3);

      const implementRoot = new THREE.Group();
      implementRoot.position.set(0, 0.18, -0.52);
      chassisGroup.add(implementRoot);

      const map: Record<string, THREE.Group> = {};

      const plow = new THREE.Group();
      const plowBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.08), mats.tractorChassis);
      plow.add(plowBar);
      for (let i = -1; i <= 1; i++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), mats.tractorHub);
        blade.position.set(i * 0.22, -0.08, -0.06);
        blade.rotation.x = Math.PI * 0.8;
        plow.add(blade);
      }
      map.bajak = plow;

      const seeder = new THREE.Group();
      const drumGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.62, 14);
      drumGeo.rotateZ(Math.PI / 2);
      const drum = new THREE.Mesh(drumGeo, mats.tractorTrim);
      drum.position.set(0, 0.08, -0.08);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.18), mats.tractorHub);
      lid.position.set(0, 0.22, -0.08);
      seeder.add(drum, lid);
      map.penabur = seeder;

      const harvester = new THREE.Group();
      const reelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.72, 8);
      reelGeo.rotateZ(Math.PI / 2);
      const reel = new THREE.Mesh(reelGeo, mats.tractorHub);
      reel.position.set(0, 0.06, -0.1);
      harvester.add(reel);
      map.pemanen = harvester;

      const trailer = new THREE.Group();
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.48), mats.woodTrunk);
      bed.position.set(0, 0.08, -0.2);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.36), mats.wheatStalk);
      crate.position.set(0, 0.22, -0.2);
      trailer.add(bed, crate);
      map.pengangkut = trailer;

      Object.values(map).forEach((g) => {
        g.visible = false;
        implementRoot.add(g);
      });

      return {
        root,
        chassisGroup,
        wheels,
        implements: map,
        currentYaw: 0,
      };
    };

    const tractorRigs: TractorRig[] = TRACTOR_BODY_COLORS.map((col, idx) => {
      const rig = createTractorRig(col);
      rig.root.visible = idx === 0;
      return rig;
    });

    // 8. Exhaust Smoke Particles
    interface Particle {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
    }
    const particles: Particle[] = [];
    const particleGeo = new THREE.DodecahedronGeometry(0.06, 0);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xe6ebef,
      roughness: 0.9,
      transparent: true,
      opacity: 0.65,
    });
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    const spawnSmoke = (wx: number, wy: number, wz: number) => {
      if (particles.length > 45) return;
      const m = new THREE.Mesh(particleGeo, smokeMat);
      m.position.set(wx, wy, wz);
      particleGroup.add(m);
      particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 0.25,
        vy: 0.6 + Math.random() * 0.4,
        vz: (Math.random() - 0.5) * 0.25,
        life: 0,
        maxLife: 0.75,
      });
    };

    // 9. Rebuild Floating Island & Grid Visuals (Wheat, Carrot, Wood, Corn)
    let lastGridSignature = '';
    let lastGridSize = 4;
    const clickableTileMeshes: THREE.Mesh[] = [];
    const swayingClusters: THREE.Group[] = [];

    const rebuildIslandAndTiles = (grid: TileData[][]) => {
      const size = grid.length;
      const offset = (size - 1) / 2;

      // Auto-adjust camera distance when island expands so larger island fits in view
      if (size !== lastGridSize) {
        const growthRatio = size / lastGridSize;
        camera.position.multiplyScalar(Math.min(1.35, Math.max(1.08, growthRatio * 0.92)));
        lastGridSize = size;
      }

      while (islandGroup.children.length > 0) islandGroup.remove(islandGroup.children[0]);
      while (tilesGroup.children.length > 0) tilesGroup.remove(tilesGroup.children[0]);
      while (cropsGroup.children.length > 0) cropsGroup.remove(cropsGroup.children[0]);
      clickableTileMeshes.length = 0;
      swayingClusters.length = 0;

      const islandWidth = size * 1.04 + 0.36;
      const earthDepth = Math.min(3.2, 1.35 + (size - 4) * 0.08);
      const topCrust = new THREE.Mesh(
        new THREE.BoxGeometry(islandWidth, 0.24, islandWidth),
        mats.islandGrassRim
      );
      topCrust.position.set(0, -0.12, 0);
      topCrust.receiveShadow = !isSoftwareGl;
      islandGroup.add(topCrust);

      const earthBlock = new THREE.Mesh(
        new THREE.BoxGeometry(islandWidth - 0.08, earthDepth, islandWidth - 0.08),
        mats.islandSoilBlock
      );
      earthBlock.position.set(0, -0.24 - earthDepth / 2, 0);
      earthBlock.castShadow = !isSoftwareGl;
      earthBlock.receiveShadow = !isSoftwareGl;
      islandGroup.add(earthBlock);

      const lowerCone = new THREE.Mesh(
        new THREE.CylinderGeometry((islandWidth - 0.2) * 0.65, (islandWidth - 0.6) * 0.35, 1.25, 4),
        mats.islandDeepEarth
      );
      lowerCone.rotation.y = Math.PI / 4;
      lowerCone.position.set(0, -0.24 - earthDepth - 0.6, 0);
      islandGroup.add(lowerCone);

      const sideAccentGeo = new THREE.DodecahedronGeometry(0.36, 0);
      const sideOffsets = [
        [-islandWidth * 0.26, -0.85, islandWidth * 0.48],
        [islandWidth * 0.24, -1.05, islandWidth * 0.48],
      ];
      sideOffsets.forEach(([rx, ry, rz], idx) => {
        const rMesh = new THREE.Mesh(sideAccentGeo, mats.cliffAccent);
        rMesh.position.set(rx, ry, rz);
        rMesh.rotation.set(idx * 0.7, idx * 1.1, idx * 0.4);
        rMesh.scale.set(1.1, 0.75, 0.85);
        islandGroup.add(rMesh);
      });

      // Keep wheat stalk density snappy on very large islands
      const wheatStep = size > 12 ? 0.24 : 0.16;

      for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
          const tile = grid[z][x];
          const wx = x - offset;
          const wz = z - offset;

          let tileMat = mats.tileWild;
          if (tile.terrain === 'lumpur') tileMat = mats.tileMud;
          else if (tile.terrain === 'pom_bensin' || tile.terrain === 'gudang')
            tileMat = mats.tileStationPad;
          else if (tile.soilState !== 'liar') tileMat = mats.tilePlowed;

          const tMesh = new THREE.Mesh(sharedTileGeo, tileMat);
          tMesh.position.set(wx, 0.04, wz);
          tMesh.receiveShadow = !isSoftwareGl;
          tMesh.userData = { gridX: x, gridZ: z };
          tilesGroup.add(tMesh);
          clickableTileMeshes.push(tMesh);

          if (tile.terrain === 'pom_bensin') {
            const station = new THREE.Group();
            station.position.set(wx, 0.08, wz);
            const pumpBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.22), mats.pumpRed);
            pumpBody.position.set(-0.22, 0.26, -0.22);
            pumpBody.castShadow = !isSoftwareGl;
            const pumpTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.26), mats.tractorHub);
            pumpTop.position.set(-0.22, 0.54, -0.22);
            const tank = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.16, 0.48, 12),
              mats.tractorHub
            );
            tank.rotation.z = Math.PI / 2;
            tank.position.set(0.12, 0.2, -0.28);
            station.add(pumpBody, pumpTop, tank);
            cropsGroup.add(station);
          } else if (tile.terrain === 'gudang') {
            const barn = new THREE.Group();
            barn.position.set(wx, 0.08, wz);
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.38, 0.42), mats.barnWood);
            body.position.set(0.16, 0.19, -0.18);
            body.castShadow = !isSoftwareGl;
            const roof = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.24, 4), mats.barnRoof);
            roof.rotation.y = Math.PI / 4;
            roof.position.set(0.16, 0.5, -0.18);
            const silo = new THREE.Mesh(
              new THREE.CylinderGeometry(0.14, 0.14, 0.58, 12),
              mats.barnRoof
            );
            silo.position.set(-0.24, 0.29, -0.22);
            barn.add(body, roof, silo);
            cropsGroup.add(barn);
          }

          // Planted or Ready Crops
          if (tile.crop && (tile.soilState === 'ditanam' || tile.soilState === 'siap_panen')) {
            const isReady = tile.soilState === 'siap_panen';
            const scaleFactor = isReady ? 1.0 : 0.35 + tile.growth * 0.5;
            const cGroup = new THREE.Group();
            cGroup.position.set(wx, 0.08, wz);

            if (tile.crop === 'jerami') {
              const stalkMat = isReady ? mats.wheatStalk : mats.wheatGreen;
              for (let sx = -0.32; sx <= 0.32; sx += wheatStep) {
                for (let sz = -0.32; sz <= 0.32; sz += wheatStep) {
                  const stalk = new THREE.Mesh(sharedWheatStalkGeo, stalkMat);
                  const hScale = scaleFactor * (0.85 + ((Math.abs(sx * 13 + sz * 7) % 3) * 0.1));
                  stalk.scale.set(1, hScale, 1);
                  stalk.position.set(sx, 0.34 * hScale, sz);
                  cGroup.add(stalk);
                }
              }
              swayingClusters.push(cGroup);
            } else if (tile.crop === 'wortel') {
              for (let cx = -0.22; cx <= 0.22; cx += 0.22) {
                for (let cz = -0.22; cz <= 0.22; cz += 0.22) {
                  const root = new THREE.Mesh(sharedCarrotRootGeo, mats.carrotOrange);
                  root.scale.setScalar(scaleFactor);
                  root.position.set(cx, 0.08 * scaleFactor, cz);
                  const leaves = new THREE.Mesh(sharedCarrotLeafGeo, mats.carrotLeaf);
                  leaves.scale.setScalar(scaleFactor);
                  leaves.position.set(cx, 0.22 * scaleFactor, cz);
                  cGroup.add(root, leaves);
                }
              }
            } else if (tile.crop === 'jagung') {
              const positions = [
                [-0.2, -0.2],
                [0.2, -0.2],
                [-0.2, 0.2],
                [0.2, 0.2],
              ];
              positions.forEach(([px, pz]) => {
                const plant = new THREE.Group();
                plant.position.set(px, 0, pz);
                plant.scale.setScalar(scaleFactor);

                const stalk = new THREE.Mesh(sharedCornStalkGeo, mats.cornStalk);
                stalk.position.set(0, 0.39, 0);
                stalk.castShadow = !isSoftwareGl;
                plant.add(stalk);

                if (isReady) {
                  const cob1 = new THREE.Mesh(sharedCornCobGeo, mats.cornCob);
                  cob1.position.set(0.06, 0.42, 0);
                  cob1.rotation.z = -0.35;
                  const cob2 = new THREE.Mesh(sharedCornCobGeo, mats.cornCob);
                  cob2.position.set(-0.06, 0.54, 0);
                  cob2.rotation.z = 0.35;
                  plant.add(cob1, cob2);
                }
                cGroup.add(plant);
              });
              swayingClusters.push(cGroup);
            } else if (tile.crop === 'kayu') {
              const trunk = new THREE.Mesh(sharedWoodTrunkGeo, mats.woodTrunk);
              trunk.scale.setScalar(scaleFactor);
              trunk.position.set(0, 0.21 * scaleFactor, 0);
              const crown = new THREE.Mesh(sharedWoodCrownGeo, mats.woodCrown);
              crown.scale.setScalar(scaleFactor);
              crown.position.set(0, 0.52 * scaleFactor, 0);
              crown.castShadow = !isSoftwareGl;
              cGroup.add(trunk, crown);
            }

            cropsGroup.add(cGroup);
          }
        }
      }
    };

    // 10. Raycasting for Tile Selection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableTileMeshes, false);
      if (hits.length > 0) {
        const { gridX, gridZ } = hits[0].object.userData;
        if (gridX !== undefined && gridZ !== undefined) {
          stateRef.current.onSelectTile({ x: gridX, z: gridZ });
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 11. Continuous Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let smokeTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const dirAngles: Record<string, number> = {
      selatan: 0,
      timur: Math.PI / 2,
      utara: Math.PI,
      barat: -Math.PI / 2,
    };

    function tick() {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();

      const {
        tiles: curTiles,
        tractor: curTractor,
        extraTractors: curExtras,
        isTitleScreen: titleMode,
        selectedTile: selTile,
      } = stateRef.current;
      const gridSize = curTiles.length;
      const offset = (gridSize - 1) / 2;

      const sig = JSON.stringify(
        curTiles.map((row) =>
          row.map((t) => `${t.terrain}:${t.soilState}:${t.crop}:${Math.floor(t.growth * 4)}`)
        )
      );
      if (sig !== lastGridSignature) {
        lastGridSignature = sig;
        rebuildIslandAndTiles(curTiles);
      }

      if (selTile && selTile.x < gridSize && selTile.z < gridSize) {
        selectMesh.visible = true;
        selectMesh.position.set(selTile.x - offset, 0.09, selTile.z - offset);
      } else {
        selectMesh.visible = false;
      }

      // Update All Active Tractors (Main Tractor + up to 3 Extra Fleet Tractors)
      const allActiveTractors: TractorState[] = [curTractor, ...(curExtras || [])];
      const dampAlpha = 1 - Math.exp(-10 * dt);

      tractorRigs.forEach((rig, idx) => {
        const tState = allActiveTractors[idx];
        if (!tState) {
          rig.root.visible = false;
          return;
        }
        rig.root.visible = true;

        _targetPos.set(tState.x - offset, 0.08, tState.z - offset);
        const distBefore = rig.root.position.distanceTo(_targetPos);
        if (distBefore > 6) {
          rig.root.position.copy(_targetPos);
        } else {
          rig.root.position.lerp(_targetPos, dampAlpha);
        }

        const targetYaw = dirAngles[tState.direction] ?? 0;
        let deltaYaw = ((targetYaw - rig.currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        rig.currentYaw += deltaYaw * (1 - Math.exp(-12 * dt));
        rig.root.rotation.y = rig.currentYaw;

        const isMovingVisually = distBefore > 0.02 || tState.isMoving;
        rig.chassisGroup.position.y =
          Math.sin(elapsed * (isMovingVisually ? 28 : 14) + idx * 1.7) * 0.008;

        if (isMovingVisually) {
          rig.wheels.forEach((w) => {
            w.children[0].rotation.x += dt * 8;
            w.children[2].rotation.x += dt * 8;
          });
        }

        Object.entries(rig.implements).forEach(([key, grp]) => {
          grp.visible = tState.implement === key;
          if (key === 'pemanen' && grp.visible) {
            grp.children[0].rotation.x += dt * 5;
          }
        });
      });

      smokeTimer += dt;
      if (smokeTimer > 0.24) {
        smokeTimer = 0;
        allActiveTractors.forEach((_t, idx) => {
          const rig = tractorRigs[idx];
          if (rig && rig.root.visible) {
            spawnSmoke(
              rig.root.position.x + Math.sin(rig.currentYaw) * 0.18,
              rig.root.position.y + 0.78,
              rig.root.position.z + Math.cos(rig.currentYaw) * 0.18
            );
          }
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particleGroup.remove(p.mesh);
          particles.splice(i, 1);
          continue;
        }
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const s = 1 + (p.life / p.maxLife) * 1.6;
        p.mesh.scale.setScalar(s);
      }

      swayingClusters.forEach((wg, idx) => {
        wg.rotation.z = Math.sin(elapsed * 2.2 + idx) * 0.035;
      });

      islandGroup.position.y = Math.sin(elapsed * 1.1) * 0.04;

      if (titleMode) {
        const camAngle = elapsed * 0.22;
        camera.position.x = Math.sin(camAngle) * 11.5;
        camera.position.z = Math.cos(camAngle) * 11.5;
        camera.position.y = 8.5 + Math.sin(elapsed * 0.5) * 0.6;
        camera.lookAt(_cameraTarget.set(0, 0.2, 0));
      } else {
        controls.update();
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-screen h-screen overflow-hidden"
      aria-label="Kanvas Ladang 3D AgroCode"
    />
  );
};
