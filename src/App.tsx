import { useState, useContext, useRef } from "react";

import "./app.module.scss";
import { ChildComponentRef, Playback } from "./Playback";

interface IProps {
  previewFileContent: any;
}

function Preview() {
  const [characterModel, setCharacterModel] = useState<any>(null);
  const [motionList, setMotionList] = useState<any>(null);
  const [countAction, setCountAction] = useState(1);
  const childRef = useRef<ChildComponentRef>(null);
  const [playing, setPlaying] = useState(true);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result;
      // Process the arrayBuffer as needed
      console.log(arrayBuffer);
      if (arrayBuffer) {
        setCharacterModel(arrayBuffer);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleMotionFileChange = (event: any) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result;
      // Process the arrayBuffer as needed
      console.log(arrayBuffer);
      if (arrayBuffer) {
        setMotionList([arrayBuffer]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handlePlayPause = () => {
    childRef.current?.handlePlayPauseAnimation();
    setPlaying(!playing);
  };

  const handleSeekbarPlayAnimation = (startIndex: number) => {
    childRef.current?.handleSeekbarPlayAnimation(startIndex);
    setPlaying(true);
  };

  const previewFileContent = {
    character: characterModel,
    motionList,
  };

  return (
    <div className="container">
      <div>
        Character: <input type="file" onChange={handleFileChange} />
      </div>
      Motion list: <input type="file" onChange={handleMotionFileChange} />
      <Playback
        previewFileContent={previewFileContent}
        ref={childRef}
        onActionFinished={(progress: number) => {
          setCountAction(progress);
        }}
        scale={150}
      />
    </div>
  );
}

export default Preview;
