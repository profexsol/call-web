import { useEffect, useState } from "react";
import MeetSegmentation from "./MeetSegmentation";

const generateColorImageUrl = (effectType, backgroundImage, width, height) => {
  if (effectType === "background_blur") {
    return null;
  }
  if (backgroundImage.type === "image") {
    return backgroundImage.value;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = backgroundImage.value;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL();
};

const MeetSegmentationWrapper = (props) => {
  const [segmentationConfig] = useState({
    model: "meet",
    backend: "wasm",
    inputResolution: "256x144",
    pipeline: "webgl2",
    targetFps: 65, // 60 introduces fps drop and unstable fps on Chrome
    deferInputResizing: false,
  });

  const [backgroundConfig, setBackgroundConfig] = useState({
    type: props.effectType,
    url: generateColorImageUrl(
      props.effectType,
      props.backgroundImage,
      100,
      100
    ),
  });

  useEffect(() => {
    setBackgroundConfig({
      type: props.effectType,
      url: generateColorImageUrl(
        props.effectType,
        props.backgroundImage,
        100,
        100
      ),
    });
  }, [props.backgroundImage, props.effectType]);

  return (
    <>
      <MeetSegmentation
        backgroundConfig={backgroundConfig}
        tflite={props.tflite}
        canvasRef={props.canvasRef}
        segmentationConfig={segmentationConfig}
      />
    </>
  );
};

export default MeetSegmentationWrapper;
