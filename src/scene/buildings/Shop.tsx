import { C, type SeasonPalette } from '../palette'
import { Barrel, Box, Crate, Door, FlagPole, Gable, GableRoof, Label, Mat, Sign, Snow, TapZone, Wall, Window } from '../kit/Parts'
import { Bush, Flowers } from '../kit/Nature'

type V3 = [number, number, number]

/**
 * LA TIENDA · colorida y accesible: toldo a rayas, gran escaparate, cajas de fruta y cartel.
 * Es donde el dinero se convierte en cosas. Mira hacia +Z.
 */
export function Shop({ position, rotation = 0, palette, night, onTap }: { position: V3; rotation?: number; palette: SeasonPalette; night: boolean; onTap: () => void }) {
  const W = 3.0
  const D = 2.3
  const H = 2.2
  const RH = 1.0
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[W + 1.2, H + RH + 0.6, D + 1.8]} onTap={onTap}>
        <Wall w={W} d={D} h={H} color={C.plasterWarm} base={0.45} />
        <GableRoof w={W} d={D} h={RH} color={C.roofOrange} dark="#b85f2c" position={[0, H, 0]} overhang={0.3} />
        <Gable w={W} h={RH} color={C.wood} position={[0, H, D / 2 - 0.12]} />
        <Gable w={W} h={RH} color={C.wood} position={[0, H, -D / 2]} />
        {palette.snow && <Snow w={W + 0.5} d={D + 0.5} y={H + RH * 0.5} />}

        {/* Toldo a rayas sobre el escaparate */}
        <group position={[0, H - 0.35, D / 2 + 0.05]}>
          {Array.from({ length: 8 }, (_, i) => (
            <Box
              key={i}
              size={[(W + 0.4) / 8, 0.05, 0.9]}
              position={[-(W + 0.4) / 2 + ((W + 0.4) / 8) * (i + 0.5), 0, 0.45]}
              rotation={[0.42, 0, 0]}
              color={i % 2 ? C.roofRed : C.white}
            />
          ))}
          {[-(W + 0.4) / 2 + 0.05, (W + 0.4) / 2 - 0.05].map((x) => (
            <Box key={x} size={[0.06, 0.9, 0.06]} position={[x, -0.55, 0.85]} color={C.woodLight} />
          ))}
        </group>

        {/* Escaparate y puerta */}
        <mesh position={[-0.55, 1.0, D / 2 + 0.03]}>
          <boxGeometry args={[1.5, 1.0, 0.04]} />
          <Mat color={night ? C.glassNight : C.glass} rough={0.2} emissive={night ? C.lantern : undefined} emissiveIntensity={night ? 0.8 : 0} />
        </mesh>
        <Box size={[1.62, 1.12, 0.06]} position={[-0.55, 1.0, D / 2 + 0.0]} color={C.woodLight} />
        <mesh position={[-0.55, 1.0, D / 2 + 0.04]}>
          <boxGeometry args={[1.5, 1.0, 0.03]} />
          <Mat color={night ? C.glassNight : C.glass} rough={0.2} emissive={night ? C.lantern : undefined} emissiveIntensity={night ? 0.8 : 0} />
        </mesh>
        <Box size={[0.04, 1.0, 0.02]} position={[-0.55, 1.0, D / 2 + 0.07]} color={C.woodLight} />
        <Box size={[1.5, 0.04, 0.02]} position={[-0.55, 1.0, D / 2 + 0.07]} color={C.woodLight} />
        <Door position={[0.95, 0, D / 2 + 0.04]} color={C.roofBlue} arch={false} />
        <Sign text="TIENDA" position={[0, H + 0.35, D / 2 + 0.1]} w={1.5} />
        <Window position={[-W / 2 - 0.04, 1.3, 0]} rotation={-Math.PI / 2} shutterColor={C.roofRed} night={night} flowers />
        <Window position={[W / 2 + 0.04, 1.3, -0.3]} rotation={Math.PI / 2} shutterColor={C.roofRed} night={night} />

        {/* Mercancía en la puerta */}
        <group position={[-1.1, 0, D / 2 + 0.6]}>
          <Crate size={0.42} />
          <Crate position={[0.5, 0, 0.1]} size={0.36} rotation={0.3} />
          {[[-0.1, 0.5, 0.05, '#f2a541'], [0.05, 0.5, -0.05, '#e5735b'], [0.55, 0.42, 0.1, '#8bc34a']].map(([x, y, z, c], i) => (
            <mesh key={i} position={[x as number, y as number, z as number]}>
              <sphereGeometry args={[0.09, 6, 5]} />
              <Mat color={c as string} />
            </mesh>
          ))}
        </group>
        <Barrel position={[W / 2 + 0.4, 0, D / 2 - 0.2]} h={0.5} />
        <FlagPole position={[-W / 2 - 0.5, 0, -D / 2 + 0.4]} h={2.6} color={C.roofRed} emblem={false} />
      </TapZone>

      <Bush position={[W / 2 + 0.9, 0, 0.6]} palette={palette} scale={0.7} />
      <Flowers position={[-W / 2 - 0.4, 0, D / 2 + 0.9]} seed={71} />
      <Label text="Tienda" y={H + RH + 0.9} />
    </group>
  )
}
