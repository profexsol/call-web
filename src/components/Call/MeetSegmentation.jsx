import { useEffect, useState, forwardRef, useRef } from "react";
import { buildWebGL2Pipeline } from "../../pipelines/webgl2/webgl2Pipeline";
import { createTimerWorker } from "../../pipelines/helpers/timerHelper";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import bus from "../bus";

import $ from "jquery";

const MeetSegmentation = (props) => {
  const classes = useStyles();

  // const canvasRef = useRef(canvas);

  const backgroundImageRef = useRef(null);

  const [pipeline, setPipeline] = useState(null);

  const [sourcePlayback, setSourcePlayback] = useState({
    htmlElement: $(".original-stream")[0],
    width: $(".original-stream")[0].videoWidth,
    height: $(".original-stream")[0].videoHeight,
  });

  const [postProcessingConfig] = useState({
    smoothSegmentationMask: true,
    jointBilateralFilter: { sigmaSpace: 3, sigmaColor: 0.3 },
    coverage: [0.5, 0.75],
    lightWrapping: 0.3,
    blendMode: "screen",
  });

  useEffect(() => {
    const targetTimerTimeoutMs = 1000 / props.segmentationConfig.targetFps;
    let renderTimeoutId;

    const imgElement = document.createElement("img");
    imgElement.src = props.backgroundConfig.url;
    backgroundImageRef.current = imgElement;

    const timerWorker = createTimerWorker();

    const newPipeline = buildWebGL2Pipeline(
      sourcePlayback,
      backgroundImageRef.current,
      props.backgroundConfig,
      props.segmentationConfig,
      props.canvasRef.current,
      props.tflite,
      timerWorker,
      () => {}
    );

    async function render() {
      const startTime = performance.now();

      if (sourcePlayback.height > 0 && sourcePlayback.width > 0) {
        await newPipeline.render();

        renderTimeoutId = timerWorker.setTimeout(
          render,
          Math.max(0, targetTimerTimeoutMs - (performance.now() - startTime))
        );
      }
    }

    bus.dispatch("call_video_effects__apply_effects_success");

    render();

    setPipeline(newPipeline);

    return () => {
      timerWorker.clearTimeout(renderTimeoutId);
      timerWorker.terminate();
      newPipeline.cleanUp();

      setPipeline(null);
    };
  }, [
    sourcePlayback,
    props.backgroundConfig,
    props.tflite,
    props.canvasRef,
    props.segmentationConfig,
  ]);

  useEffect(() => {
    if (pipeline && sourcePlayback.htmlElement) {
      pipeline.updatePostProcessingConfig(postProcessingConfig);
    }
  }, [sourcePlayback, pipeline, postProcessingConfig, props.tflite]);

  useEffect(() => {
    const handleResize = () => {
      if (sourcePlayback.htmlElement) {
        setSourcePlayback((prevPlayback) => ({
          ...prevPlayback,
          width: sourcePlayback.htmlElement.videoWidth,
          height: sourcePlayback.htmlElement.videoHeight,
        }));
      }
    };

    const videoElement = $(".original-stream")[0];
    videoElement.addEventListener("resize", handleResize);

    return () => {
      videoElement.removeEventListener("resize", handleResize);
    };
  }, [sourcePlayback.htmlElement]);

  return (
    <canvas
      key={props.segmentationConfig.pipeline}
      ref={props.canvasRef}
      className={classes.render}
      width={sourcePlayback.width}
      height={sourcePlayback.height}
    />
  );
};

const useStyles = makeStyles((theme) =>
  createStyles({
    render: {
      position: "absolute",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
  })
);

export default MeetSegmentation;
