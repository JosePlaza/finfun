import { C, type SeasonPalette } from '../palette'
import { Box, CoinEmblem, Column, Door, FlagPole, FloatingCoin, Gable, GableRoof, Label, Lantern, Sign, Snow, Steps, TapZone, Wall, Window } from '../kit/Parts'
import { Bush, Flowers } from '../kit/Nature'

type V3 = [number, number, number]

/**
 * EL BANCO · sólido, importante y confiable, pero acogedor. Piedra + madera, tejado azul,
 * pórtico con columnas, frontón con moneda, cartel y bandera. Mira hacia +Z.
 */
export function Bank({ position, rotation = 0, palette, night, unlocked, cents, onTap }: {
  position: V3
  rotation?: number
  palette: SeasonPalette
  night: boolean
  unlocked: boolean
  cents: number
  onTap: () => void
}) {
  const W = 3.6
  const D = 2.8
  const H = 2.5
  const RH = 1.3
  const PLINTH = 0.36
  const roof = C.roofBlue
  const roofDark = C.roofBlueDark
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[W + 1.4, H + RH + 1, D + 2.2]} onTap={onTap}>
        {/* Plataforma y escalinata */}
        <Box size={[W + 1.2, PLINTH, D + 1.4]} position={[0, PLINTH / 2, 0.3]} color={C.stone} flat />
        <Steps count={2} width={2.4} rise={PLINTH / 2} position={[0, 0, D / 2 + 1.0]} />

        {/* Cuerpo */}
        <group position={[0, PLINTH, 0]}>
          <Wall w={W} d={D} h={H} color={C.plaster} base={0.9} />
          <GableRoof w={W} d={D} h={RH} color={roof} dark={roofDark} position={[0, H, 0]} overhang={0.35} rows={4} />
          <Gable w={W + 0.7} h={RH} color={C.plaster} position={[0, H, D / 2 + 0.35]} />
          <Gable w={W} h={RH} color={C.plaster} position={[0, H, -D / 2 - 0.12]} />
          <CoinEmblem position={[0, H + RH * 0.42, D / 2 + 0.5]} r={0.34} />
          {palette.snow && <Snow w={W + 0.7} d={D + 0.7} y={H + RH * 0.55} />}

          {/* Pórtico */}
          {[-1.35, -0.45, 0.45, 1.35].map((x) => (
            <Column key={x} h={H - 0.1} position={[x, 0, D / 2 + 0.75]} />
          ))}
          <Box size={[W + 0.7, 0.16, 1.1]} position={[0, H - 0.02, D / 2 + 0.45]} color={C.stone} />

          {/* Puerta doble y cartel */}
          <Door w={1.3} h={1.75} arch={false} color={C.woodDark} position={[0, 0, D / 2 + 0.04]} />
          <Box size={[0.04, 1.75, 0.03]} position={[0, 0.875, D / 2 + 0.11]} color={C.gold} />
          <Sign text="BANCO" tone="navy" position={[0, 2.15, D / 2 + 0.12]} w={1.7} />

          {/* Ventanas altas con contraventanas azul marino */}
          <Window position={[-W / 2 - 0.04, 1.5, 0.3]} rotation={-Math.PI / 2} shutterColor={C.navy} night={night} flowers />
          <Window position={[-W / 2 - 0.04, 1.5, -0.7]} rotation={-Math.PI / 2} shutterColor={C.navy} night={night} />
          <Window position={[W / 2 + 0.04, 1.5, 0.3]} rotation={Math.PI / 2} shutterColor={C.navy} night={night} flowers />
          <Window position={[W / 2 + 0.04, 1.5, -0.7]} rotation={Math.PI / 2} shutterColor={C.navy} night={night} />
          <Window position={[0, 1.5, -D / 2 - 0.04]} rotation={Math.PI} shutterColor={C.navy} night={night} />

          {/* Chimenea del interés: cuando hay saldo, asoma una moneda */}
          <Box size={[0.34, 0.8, 0.34]} position={[-1.1, H + 0.5, -0.5]} color={C.stoneDark} flat />
          {unlocked && cents > 0 && <FloatingCoin base={H + 1.1} radius={0.05} />}
        </group>

        {/* Farolas y bandera */}
        <Lantern position={[-1.9, PLINTH, D / 2 + 1.3]} lit={night} />
        <Lantern position={[1.9, PLINTH, D / 2 + 1.3]} lit={night} />
        <FlagPole position={[W / 2 + 0.9, 0, -0.6]} h={3.6} />

        {/* Andamio y cartel mientras está en obras */}
        {!unlocked && (
          <>
            {[0.5, 1.2, 1.9].map((y) => (
              <Box key={y} size={[W + 1.0, 0.1, 0.08]} position={[0, PLINTH + y, D / 2 + 1.0]} rotation={[0, 0, y === 1.2 ? 0.08 : -0.06]} color={C.woodLight} />
            ))}
            <Sign text="EN OBRAS" position={[0, PLINTH + 1.0, D / 2 + 1.6]} w={1.6} />
          </>
        )}
      </TapZone>

      {/* Plaza y jardín */}
      <mesh position={[0, 0.02, D / 2 + 2.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.9, 12]} />
        <meshStandardMaterial color={C.stone} roughness={1} />
      </mesh>
      <Flowers position={[-2.3, 0, D / 2 + 0.2]} seed={11} />
      <Flowers position={[2.3, 0, D / 2 + 0.2]} seed={13} />
      <Bush position={[-2.7, 0, -0.8]} palette={palette} scale={0.9} />
      <Bush position={[2.7, 0, -1.0]} palette={palette} scale={0.7} />

      <Label
        text="Banco"
        sub={unlocked ? undefined : 'abre al terminar el año 1'}
        amount={unlocked ? (cents / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }) : undefined}
        tone={unlocked ? 'default' : 'locked'}
        y={PLINTH + H + RH + 0.8}
      />
    </group>
  )
}
