import {useColorScheme} from 'react-native'
import Svg, {
  Defs,
  Ellipse,
  Line,
  Path,
  Pattern,
  Polygon,
  Rect,
} from 'react-native-svg'

type ConstructionGraphicProps = {
  width: number
}

/** Barricade, cone, and crane. Decorative; the screen title carries the meaning. */
export function ConstructionGraphic({width}: ConstructionGraphicProps) {
  const dark = useColorScheme() === 'dark'
  const ground = dark ? '#3F3F46' : '#D6D3D1'
  const steel = dark ? '#E7E5E4' : '#44403C'
  const height = Math.round(width * (200 / 320))

  return (
    <Svg width={width} height={height} viewBox="0 0 320 200">
      <Defs>
        <Pattern
          id="maintenanceHazard"
          patternUnits="userSpaceOnUse"
          width="14"
          height="40"
          patternTransform="rotate(-45)">
          <Rect width="7" height="40" fill="#171717" />
          <Rect x="7" width="7" height="40" fill="#F5C518" />
        </Pattern>
      </Defs>

      <Ellipse cx="160" cy="184" rx="126" ry="10" fill={ground} />

      <Rect x="232" y="34" width="10" height="124" rx="1" fill={steel} />
      <Rect x="210" y="150" width="54" height="8" rx="1" fill={steel} />
      <Rect x="108" y="34" width="156" height="8" rx="1" fill={steel} />
      <Rect x="242" y="46" width="26" height="12" rx="1" fill={steel} />
      <Line
        x1="136"
        y1="42"
        x2="136"
        y2="96"
        stroke={steel}
        strokeWidth="2"
      />
      <Path d="M128 96 h16 v7 h-5 l-3 9 -3-9 h-5 z" fill={steel} />

      <Polygon points="46,162 74,92 102,162" fill="#EA580C" />
      <Polygon points="54,128 94,128 98,144 50,144" fill="#FFF7ED" />
      <Rect x="38" y="158" width="72" height="10" rx="2" fill="#292524" />

      <Line
        x1="128"
        y1="168"
        x2="154"
        y2="118"
        stroke={steel}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Line
        x1="236"
        y1="168"
        x2="210"
        y2="118"
        stroke={steel}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Rect
        x="118"
        y="108"
        width="128"
        height="34"
        rx="3"
        fill="url(#maintenanceHazard)"
      />
    </Svg>
  )
}
