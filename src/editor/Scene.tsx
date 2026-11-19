import {
  Circle,
  Group,
  Image,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  Skia,
  Text,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';

import { CANVAS, type CanvasElement, type Composition } from '@/domain/composition';
import type { Period, Totals } from '@/domain/totals';
import type { Activity, Units } from '@/domain/types';

import type { FontPair, TemplateFonts } from './fonts';
import type { Shape } from './shapes';
import { templateById } from './templates';

export type SceneProps = {
  composition: Pick<Composition, 'background' | 'elements'>;
  activity: Activity;
  units: Units;
  fonts: TemplateFonts;
  /** decoded background photo, when the background is a photo */
  photo: SkImage | null;
  selectedId?: string | null;
  /** totals for the periods containing the activity (Totals stickers) */
  totals?: Record<Period, Totals>;
};

/**
 * The whole story at 1080 x 1920. Props only (no hooks or context), because the
 * export renders it offscreen with drawAsImage, outside the app's React tree.
 */
export function Scene({ composition, activity, units, fonts, photo, selectedId, totals }: SceneProps) {
  return (
    <Group>
      <Background bg={composition.background} photo={photo} />
      {composition.elements.map((el) => (
        <ElementView
          key={el.id}
          element={el}
          activity={activity}
          units={units}
          totals={totals}
          fonts={fonts[el.font] ?? fonts.inter}
          selected={el.id === selectedId}
        />
      ))}
    </Group>
  );
}

function Background({ bg, photo }: { bg: Composition['background']; photo: SkImage | null }) {
  if (bg.kind === 'photo' && photo) {
    return (
      <Group>
        <Image image={photo} x={0} y={0} width={CANVAS.w} height={CANVAS.h} fit="cover" />
        {/* soft scrims top and bottom keep white text readable on bright photos */}
        <Rect x={0} y={0} width={CANVAS.w} height={CANVAS.h}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, CANVAS.h)}
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
            positions={[0, 0.25, 0.65, 1]}
          />
        </Rect>
      </Group>
    );
  }
  if (bg.kind === 'gradient') {
    return (
      <Rect x={0} y={0} width={CANVAS.w} height={CANVAS.h}>
        <LinearGradient start={vec(0, 0)} end={vec(0, CANVAS.h)} colors={[bg.from, bg.to]} />
      </Rect>
    );
  }
  return <Rect x={0} y={0} width={CANVAS.w} height={CANVAS.h} color={bg.kind === 'solid' ? bg.colour : '#000000'} />;
}

function ElementView({
  element: el,
  activity,
  units,
  totals,
  fonts,
  selected,
}: {
  element: CanvasElement;
  activity: Activity;
  units: Units;
  totals?: Record<Period, Totals>;
  fonts: FontPair;
  selected: boolean;
}) {
  const t = templateById(el.templateId);
  if (!t) return null;
  const shapes = t.render({ activity, units, totals, text: el.text, stats: el.stats });
  return (
    <Group
      transform={[
        { translateX: el.x },
        { translateY: el.y },
        { rotate: el.rotation },
        { scale: el.scale },
        { translateX: -t.size.w / 2 },
        { translateY: -t.size.h / 2 },
      ]}>
      <Shapes shapes={shapes} fonts={fonts} colour={el.colour} />
      {selected && (
        <RoundedRect
          x={-16}
          y={-16}
          width={t.size.w + 32}
          height={t.size.h + 32}
          r={20}
          color="rgba(255,255,255,0.9)"
          style="stroke"
          strokeWidth={4 / el.scale}
        />
      )}
    </Group>
  );
}

/** Draw template shapes with one colour and font pair. Also used for template previews. */
export function Shapes({ shapes, fonts, colour }: { shapes: Shape[]; fonts: FontPair; colour: string }) {
  return (
    <>
      {shapes.map((s, i) => {
        if (s.kind === 'text') {
          if (!s.text) return null;
          const text = s.caps ? s.text.toUpperCase() : s.text;
          const face = s.face === 'value' ? fonts.value : fonts.label;
          let font = Skia.Font(face, s.size);
          let width = font.measureText(text).width;
          if (s.maxWidth && width > s.maxWidth) {
            font = Skia.Font(face, (s.size * s.maxWidth) / width);
            width = font.measureText(text).width;
          }
          const x = s.align === 'center' ? s.x - width / 2 : s.align === 'right' ? s.x - width : s.x;
          return <Text key={i} x={x} y={s.y} text={text} font={font} color={colour} opacity={s.opacity ?? 1} />;
        }
        if (s.kind === 'polyline') {
          if (s.points.length < 2) return null;
          const builder = Skia.PathBuilder.Make();
          builder.moveTo(s.points[0].x, s.points[0].y);
          for (const p of s.points.slice(1)) builder.lineTo(p.x, p.y);
          const path = builder.build();
          const end = s.points[s.points.length - 1];
          return (
            <Group key={i} opacity={s.opacity ?? 1}>
              <Path path={path} color={colour} style="stroke" strokeWidth={s.width} strokeJoin="round" strokeCap="round" />
              {s.endDot && <Circle cx={end.x} cy={end.y} r={s.width * 1.3} color={colour} />}
            </Group>
          );
        }
        return (
          <RoundedRect
            key={i}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            r={s.r ?? 0}
            color={colour}
            opacity={s.opacity ?? 1}
            style={s.stroke ? 'stroke' : 'fill'}
            strokeWidth={s.stroke}
          />
        );
      })}
    </>
  );
}
