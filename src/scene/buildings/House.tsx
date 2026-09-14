import { C, type SeasonPalette } from '../palette'
import { Html } from '@react-three/drei'
import { Barrel, Box, Chimney, Crate, Door, Fence, FloatingCoin, Gable, GableRoof, Label, Snow, TapZone, Wall, Window } from '../kit/Parts'
import { formatCents } from '../../sim'
import { Bush, Flowers, GrassTuft } from '../kit/Nature'

type V3 = [number, number, number]

/**
 * LA CASA · hogar del jugador. Acogedora y doméstica: madera, piedra, teja roja, huerto y valla.
 * Mira hacia +Z (la puerta está en la cara +Z).
 */
export function House({ position, rotation = 0, palette, night, mailboxCents, onTap, onMailbox }: {
  position: V3
  rotation?: number
  palette: SeasonPalette
  night: boolean
  mailboxCents: number
  onTap: () => void
  onMailbox: () => void
}) {
  const W = 2.6
  const D = 2.2
  const H = 2.1
  const RH = 1.15
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <TapZone size={[W + 0.6, H + RH + 0.5, D + 0.6]} onTap={onTap}>
        <Wall w={W} d={D} h={H} color={C.plasterWarm} base={0.6} />
        <GableRoof w={W} d={D} h={RH} position={[0, H, 0]} />
        <Gable w={W} h={RH} color={C.wood} position={[0, H, D / 2 - 0.12]} />
        <Gable w={W} h={RH} color={C.wood} position={[0, H, -D / 2]} />
        <Chimney position={[0.8, H + 0.36, -0.45]} h={0.95} smoke={!night} />
        {palette.snow && <Snow w={W + 0.5} d={D + 0.5} y={H + RH * 0.55} />}

        {/* Fachada */}
        <Door position={[-0.35, 0, D / 2 + 0.04]} />
        <Window position={[0.75, 1.25, D / 2 + 0.04]} flowers night={night} shutterColor={C.roofBlue} />
        <Window position={[-W / 2 - 0.04, 1.25, -0.3]} rotation={-Math.PI / 2} night={night} shutterColor={C.roofBlue} />
        <Window position={[W / 2 + 0.04, 1.25, 0.2]} rotation={Math.PI / 2} night={night} shutterColor={C.roofBlue} flowers />
        {/* Ventanita del desván */}
        <Window position={[0, H + 0.5, D / 2 + 0.02]} w={0.4} h={0.4} shutters={false} night={night} />

        {/* Porche */}
        <Box size={[W + 0.4, 0.12, 0.9]} position={[0, 0.06, D / 2 + 0.45]} color={C.woodLight} />
        <Box size={[1.4, 0.16, 0.5]} position={[-0.35, 0.16, D / 2 + 0.95]} color={C.stone} flat />
      </TapZone>

      {/* Jardín y huerto */}
      <group position={[0, 0, 0]}>
        <Fence length={3.6} position={[-0.2, 0, D / 2 + 2.2]} />
        <Fence length={2.4} position={[-2.0, 0, D / 2 + 1.0]} rotation={Math.PI / 2} />
        <Fence length={1.6} position={[1.6, 0, D / 2 + 1.7]} rotation={Math.PI / 2} />
        {/* bancales */}
        {[[-1.3, 1.9], [-1.3, 2.5]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <Box size={[1.0, 0.16, 0.45]} position={[0, 0.08, 0]} color={C.woodDark} />
            <Box size={[0.9, 0.06, 0.36]} position={[0, 0.17, 0]} color="#5a3d2a" />
            {[-0.3, 0, 0.3].map((gx) => (
              <GrassTuft key={gx} position={[gx, 0.2, 0]} palette={palette} scale={0.8} />
            ))}
          </group>
        ))}
        <Flowers position={[1.0, 0, D / 2 + 0.6]} seed={3} />
        <Flowers position={[-1.6, 0, D / 2 + 0.7]} seed={5} count={4} />
        <Bush position={[W / 2 + 0.7, 0, -0.6]} palette={palette} scale={0.8} />
        <Crate position={[-W / 2 - 0.5, 0, 0.3]} size={0.4} rotation={0.4} />
        <Barrel position={[-W / 2 - 0.55, 0, -0.35]} h={0.5} />
      </group>

      {/* Bocadillo con la paga pendiente: flota sobre la casa y se recoge al tocarlo */}
      {mailboxCents > 0 && (
        <group position={[0, H + RH + 0.9, 0]}>
          <Html center distanceFactor={12} zIndexRange={[8, 0]}>
            <button type="button" className="coin-bubble" onClick={onMailbox}>
              <span className="coin-bubble__coins" aria-hidden="true">
                <i /><i /><i />
              </span>
              <span className="coin-bubble__amount">+{formatCents(mailboxCents)}</span>
              <span className="coin-bubble__hint">¡Toca para recoger tu paga!</span>
            </button>
          </Html>
          {[0, 1, 2].map((i) => (
            <FloatingCoin key={i} index={i} base={-0.5} radius={0.45} />
          ))}
        </group>
      )}

      {/* Buzón: decoración de la casa; la banderita sube cuando hay paga */}
      <TapZone size={[1.2, 1.8, 1.2]} position={[1.9, 0, D / 2 + 1.3]} onTap={onMailbox}>
        <Box size={[0.08, 0.85, 0.08]} position={[0, 0.42, 0]} color={C.woodLight} />
        <Box size={[0.3, 0.26, 0.48]} position={[0, 0.95, 0]} color={mailboxCents > 0 ? C.red : C.metal} />
        <mesh position={[0, 1.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.3, 8, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={mailboxCents > 0 ? C.red : C.metal} roughness={0.8} />
        </mesh>
        <Box size={[0.04, 0.22, 0.12]} position={[0.18, mailboxCents > 0 ? 1.2 : 1.0, -0.1]} rotation={[0, 0, mailboxCents > 0 ? 0 : Math.PI / 2]} color={C.gold} />
      </TapZone>

      {mailboxCents === 0 && <Label text="Casa" y={H + RH + 0.7} />}
    </group>
  )
}
