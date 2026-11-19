import {
  Apple, Armchair, ArrowRight, Car, Cat, CircleCheck, Dices, DoorOpen, EyeOff, Flower2, Hand, Hash, Headphones, Image, Images, Keyboard, Lamp, Laptop,
  Maximize2, Megaphone, MessageCircle, Mouse, MousePointerClick, Music, OctagonX, Package, Palette, Plug, Power, Printer, Save, Scissors, Search, Shirt,
  Speaker, Trash2, Volume2, type LucideProps,
} from 'lucide-react'

// Lucide has no spoon or teddy bear, so these two are drawn in the same 24px, 2px-stroke line style.
const Line = ({ size = 24, strokeWidth = 2, className, children }: LucideProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
)
const Spoon = (p: LucideProps) => <Line {...p}><ellipse cx="12" cy="6.5" rx="3.5" ry="4.5" /><path d="M12 11v10" /></Line>
const Teddy = (p: LucideProps) => (
  <Line {...p}><circle cx="7" cy="5.5" r="2" /><circle cx="17" cy="5.5" r="2" /><circle cx="12" cy="9" r="4.5" /><path d="M8.5 13.5a5 5 0 1 0 7 0" /><path d="M11 9.5h.01M13 9.5h.01" /></Line>
)

/** Icons for the emoji the sheet uses as stand-in pictures (see ICON in scripts/sheet-to-bank.mjs). */
export const ICONS: Record<string, (p: LucideProps) => React.ReactNode> = {
  laptop: Laptop, apple: Apple, chair: Armchair, mouse: Mouse, spoon: Spoon, teddy: Teddy, keyboard: Keyboard,
  speaker: Speaker, headphones: Headphones, hand: Hand, megaphone: Megaphone, printer: Printer, save: Save,
  trash: Trash2, scissors: Scissors, search: Search, sound: Volume2,
  power: Power, plug: Plug, cat: Cat, image: Image, music: Music, box: Package, shirt: Shirt, hide: EyeOff, bigger: Maximize2,
  click: MousePointerClick, palette: Palette, number: Hash, yesno: CircleCheck, door: DoorOpen, clap: Hand, talk: MessageCircle,
  forward: ArrowRight, flower: Flower2, stop: OctagonX, pictures: Images, guess: Dices, lamp: Lamp, car: Car,
}
