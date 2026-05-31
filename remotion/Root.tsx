import { Composition } from "remotion";
import { DemoVideo, FPS, TOTAL } from "./DemoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="EdeviserDemo"
      component={DemoVideo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
