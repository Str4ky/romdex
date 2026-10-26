import React from "react";
import img3ds from "./icons/3ds.png";
import imgDs from "./icons/ds.png";
import imgGb from "./icons/gb.png";
import imgGba from "./icons/gba.png";
import imgGcn from "./icons/gcn.png";
import imgNes from "./icons/nes.png";
import imgSnes from "./icons/snes.png";
import imgSwitch from "./icons/switch.png";
import imgDisc from "./icons/disc.png";
import imgPsp from "./icons/psp.png";
import imgPsVita from "./icons/psvita.png";
import imgMasterSystem from "./icons/mastersystem.png";
import imgMegaDrive from "./icons/megadrive.png";
import imgGameGear from "./icons/gamegear.png";
import imgDreamcast from "./icons/dreamcast.png";
import imgNeoGeo from "./icons/neogeo.png";
import imgNeoGeoPocket from "./icons/neogeopocket.png";
import imgMobigo from "./icons/mobigo.png";
import imgVSmile from "./icons/vsmile.png";

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function makeIcon(src: string) {
  return function Icon({ size = 28, className, style }: IconProps) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          backgroundColor: "currentColor",
          WebkitMask: `url(${src}) no-repeat center / contain`,
          mask: `url(${src}) no-repeat center / contain`,
          ...style,
        }}
      />
    );
  };
}

export const Icon3DS = makeIcon(img3ds);
export const IconDS = makeIcon(imgDs);
export const IconGB = makeIcon(imgGb);
export const IconGBA = makeIcon(imgGba);
export const IconGCN = makeIcon(imgGcn);
export const IconNES = makeIcon(imgNes);
export const IconSNES = makeIcon(imgSnes);
export const IconSwitch = makeIcon(imgSwitch);
export const IconDisc = makeIcon(imgDisc);
export const IconPSP = makeIcon(imgPsp);
export const IconPSVita = makeIcon(imgPsVita);
export const IconMasterSystem = makeIcon(imgMasterSystem);
export const IconMegaDrive = makeIcon(imgMegaDrive);
export const IconGameGear = makeIcon(imgGameGear);
export const IconDreamcast = makeIcon(imgDreamcast);
export const IconNeoGeo = makeIcon(imgNeoGeo);
export const IconNeoGeoPocket = makeIcon(imgNeoGeoPocket);
export const IconMobigo = makeIcon(imgMobigo);
export const IconVSmile = makeIcon(imgVSmile);

export const consoleIconMap: Record<string, React.FC<IconProps>> = {
  nes: IconNES,
  snes: IconSNES,
  gb: IconGB,
  gba: IconGBA,
  ds: IconDS,
  "3ds": Icon3DS,
  disc: IconDisc,
  gcn: IconGCN,
  switch: IconSwitch,
  psp: IconPSP,
  psvita: IconPSVita,
  mastersystem: IconMasterSystem,
  megadrive: IconMegaDrive,
  gamegear: IconGameGear,
  dreamcast: IconDreamcast,
  neogeo: IconNeoGeo,
  neogeopocket: IconNeoGeoPocket,
  mobigo: IconMobigo,
  vsmile: IconVSmile,
};
