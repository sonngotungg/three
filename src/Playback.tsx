import {
  useLayoutEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

export interface PlaybackProps {
  previewFileContent: {
    character?: ArrayBuffer;
    motionList?: ArrayBuffer[];
  };
  isLoading?: boolean;
  cameraView?: number;
  hiddenBG?: boolean;
  hiddenFL?: boolean;
  scale?: number;
  orbit?: boolean;
  onActionFinished?: (value: number) => void;
}

export interface ChildComponentRef {
  handlePlayPauseAnimation: () => void;
  handleSeekbarPlayAnimation: (startIndex: number) => void;
}

type PlaybackToolType = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  orbitControls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  loader: FBXLoader;
};

type PlayBackDataType = {
  renderElementId: string;
  clock: THREE.Clock;
  modelReady: boolean;
  tools: PlaybackToolType;
  mixer: THREE.AnimationMixer;
  characterObject: THREE.Object3D;
  globalActions: THREE.AnimationAction[];
  globalClips: THREE.AnimationClip[];
  onAnimationFinishedGlobal: () => void;
};

function initTools(
  tools: PlaybackToolType,
  width?: number,
  height?: number,
  cameraView?: number,
  hiddenBG?: boolean,
  hiddenFL?: boolean,
  orbit?: boolean
) {
  tools.scene = new THREE.Scene();
  tools.camera = new THREE.PerspectiveCamera(
    cameraView ?? 45,
    window.innerWidth / window.innerHeight,
    0.2,
    1000
  );
  tools.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  tools.loader = new FBXLoader();
  // init scene
  tools.scene.background = new THREE.Color("white");

  tools.scene.add(new THREE.AxesHelper(0));

  // add floor
  const grid = new THREE.GridHelper(1000, 100, "white", "white");
  //   tools.scene.add(grid);

  // add light
  const spotLight = new THREE.SpotLight(0xffffff, 1);
  spotLight.position.set(30, 450, 150);

  // make it cast shadows
  spotLight.castShadow = true;
  spotLight.receiveShadow = true;

  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.bias = -0.0001;
  tools.scene.add(spotLight);

  tools.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  // dirLight.position.set(-60, 100, -10);
  dirLight.position.set(0, 200, 0);

  dirLight.castShadow = true;
  dirLight.receiveShadow = true;

  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 512;
  dirLight.shadow.mapSize.height = 512;
  tools.scene.add(dirLight);

  const planeGeometry = new THREE.PlaneGeometry(550, 550, 570, 570);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: "gray" });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.set(-1.5708, 0, 0);
  plane.position.y = -5;
  plane.castShadow = true;

  plane.receiveShadow = true;
  tools.scene.add(plane);

  // Adjust camera position
  tools.camera.position.x = 200;
  tools.camera.position.y = 200;
  tools.camera.position.z = 400;
  tools.camera.lookAt(new THREE.Vector3(0, 0, 0));

  // Adjust renderer size
  tools.renderer.setSize(
    width ? width : (window.innerWidth * 8) / 9,
    height ? height : (window.innerHeight * 6) / 7
  );
  tools.renderer.setPixelRatio(window.devicePixelRatio);
  tools.renderer.shadowMap.enabled = true;
  tools.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  tools.renderer.outputEncoding = THREE.sRGBEncoding;

  // Handle orbit controls
  tools.orbitControls = new OrbitControls(
    tools.camera,
    tools.renderer.domElement
  );
  tools.orbitControls.enableDamping = true;
  tools.orbitControls.dampingFactor = 0.1;
  tools.orbitControls.minDistance = 1;
  tools.orbitControls.maxDistance = 800;
  tools.orbitControls.enablePan = false;
  tools.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
  tools.orbitControls.target.set(0, 100, 0);
  tools.orbitControls.enabled = false;
  if (orbit) {
    tools.orbitControls.enabled = true;
  }
}

function startRender(playbackData: PlayBackDataType) {
  // Append canvas to DOM
  const renderContainer = document.getElementById(playbackData.renderElementId);
  renderContainer ? (renderContainer.innerHTML = "") : null;
  renderContainer?.appendChild(playbackData.tools.renderer.domElement);

  playbackData.tools.renderer.domElement.style.border = "solid 1px none";

  function animate() {
    requestAnimationFrame(animate);

    playbackData.tools.orbitControls.update();
    if (playbackData.modelReady) {
      playbackData.mixer?.update(playbackData.clock.getDelta());
      // updateSeekBar();
    }
    playbackData.tools.orbitControls.update();
    playbackData.tools.renderer.render(
      playbackData.tools.scene,
      playbackData.tools.camera
    );
  }

  animate();
}

function loadFBXFromBuffer(
  playbackData: PlayBackDataType,
  data: ArrayBuffer[],
  scale: number
) {
  playbackData.modelReady = false;

  const { loader, scene } = playbackData.tools;

  const clips: THREE.AnimationClip[] = [];
  const actions: THREE.AnimationAction[] = [];
  let totalDuration = 0;

  if (playbackData.characterObject) {
    playbackData.characterObject.removeFromParent();
  }

  for (let i = 0; i < data.length; i++) {
    const object = loader.parse(data[i], "");
    if (i === 0) {
      playbackData.mixer = new THREE.AnimationMixer(object);

      scene.add(object);

      playbackData.characterObject = object;
    }
    object.traverse(function (node: any) {
      console.log(node);
      node.castShadow = true;
      node.receiveShadow = true;
    });
    object.scale.set(scale, scale, scale);
    object.updateMatrix();
    object.animations.forEach(function (animationClip: any) {
      if (animationClip.duration <= 0) {
        return;
      }

      clips.push(animationClip);
      totalDuration += animationClip.duration;

      const action = playbackData.mixer.clipAction(animationClip);
      action.loop = THREE.LoopOnce; // This makes the animation only play once
      action.clampWhenFinished = true; // This prevents the animation from resetting after it's finished

      actions.push(action);
    });
  }

  playbackData.modelReady = true;

  playbackData.globalActions.length = 0;
  playbackData.globalActions.push(...actions);

  playbackData.globalClips.length = 0;
  playbackData.globalClips.push(...clips);

  return { actions, clips, totalDuration };
}

function handlePlayWholeAnimations(
  playbackData: PlayBackDataType,
  { actions }: { actions: THREE.AnimationAction[] },
  onFinish?: () => void,
  onActionFinished?: (value: number) => void,
  startIndex?: number
) {
  let currentIndex = startIndex ?? 0;
  let previousAction: THREE.AnimationAction,
    currentAction: THREE.AnimationAction;

  playbackData.mixer.removeEventListener(
    "finished",
    playbackData.onAnimationFinishedGlobal
  );

  function playNextAnimation() {
    previousAction = currentAction;
    currentAction = actions[currentIndex];
    if (previousAction) {
      previousAction.fadeOut(0.5);
    }

    currentAction?.reset();
    currentAction?.fadeIn(0.5);
    currentAction?.play();
  }

  playbackData.onAnimationFinishedGlobal = function onAnimationFinished() {
    currentIndex++;

    onActionFinished?.(currentIndex);

    if (currentIndex < actions.length) {
      playNextAnimation();
    } else {
      onFinish?.();
      currentIndex = 0;
      playNextAnimation();
    }
  };

  playbackData.mixer.addEventListener(
    "finished",
    playbackData.onAnimationFinishedGlobal
  );

  playNextAnimation();
}

function resetActions(actions: THREE.AnimationAction[]) {
  actions.forEach((action) => {
    action.reset();
  });
}

function stopActions(actions: THREE.AnimationAction[]) {
  actions.forEach((action) => {
    action.stop();
  });
}

function stopAllActions(
  playbackData: PlayBackDataType,
  notUncacheClips?: boolean
) {
  if (playbackData.mixer) {
    playbackData.mixer.stopAllAction();
    playbackData.mixer.removeEventListener(
      "finished",
      playbackData.onAnimationFinishedGlobal
    );
    if (!notUncacheClips) {
      for (let i = playbackData.globalClips.length - 1; i >= 0; i--) {
        playbackData.mixer.uncacheClip(playbackData.globalClips[i]);
      }
    }
  }
}

export const Playback = forwardRef<ChildComponentRef, PlaybackProps>(
  (
    {
      isLoading,
      previewFileContent,
      cameraView,
      hiddenBG,
      hiddenFL,
      onActionFinished,
      scale = 100,
      orbit = true,
    },
    ref
  ) => {
    const playBackData = useMemo(() => {
      return {
        renderElementId: "renderer-" + Math.floor(Math.random() * 10e6),
        clock: new THREE.Clock(),
        modelReady: false,
        tools: {} as PlaybackToolType,
        mixer: null as unknown as THREE.AnimationMixer,
        characterObject: null as unknown as THREE.Object3D,
        globalActions: [] as THREE.AnimationAction[],
        globalClips: [] as THREE.AnimationClip[],
        onAnimationFinishedGlobal: undefined as unknown as () => void,
      } as PlayBackDataType;
    }, []);

    useLayoutEffect(() => {
      playBackData.modelReady = false;
      initTools(
        playBackData.tools,
        undefined,
        undefined,
        cameraView,
        hiddenBG,
        hiddenFL,
        orbit
      );
      startRender(playBackData);
    }, []);

    useLayoutEffect(() => {
      if (previewFileContent.character) {
        const { character, motionList } = previewFileContent;
        const animationData = [character];
        if (motionList) {
          animationData.push(...motionList);
        }
        const { actions } = loadFBXFromBuffer(
          playBackData,
          animationData,
          scale as number
        );
        handlePlayWholeAnimations(
          playBackData,
          { actions },
          undefined,
          onActionFinished
        );
      }

      return () => {
        stopAllActions(playBackData);
      };
    }, [previewFileContent]);
    useLayoutEffect(() => {
      if (isLoading) {
        stopAllActions(playBackData);
      }
    }, [isLoading]);

    const handlePlayPauseAnimation = () => {
      if (playBackData.mixer.timeScale === 1) {
        playBackData.mixer.timeScale = 0;
      } else {
        playBackData.mixer.timeScale = 1;
      }
    };

    const handleSeekbarPlayAnimation = (startIndex: number) => {
      stopAllActions(playBackData, true);
      if (previewFileContent.character) {
        handlePlayWholeAnimations(
          playBackData,
          { actions: playBackData.globalActions },
          undefined,
          onActionFinished,
          startIndex
        );
      }
    };

    useImperativeHandle(ref, () => ({
      handlePlayPauseAnimation,
      handleSeekbarPlayAnimation,
    }));

    return <div id={playBackData.renderElementId}></div>;
  }
);
