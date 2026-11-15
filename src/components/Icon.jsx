import * as Lucide from 'lucide-react'

// Looks up an icon by name from data.js, e.g. <Icon name="Truck" size={18} />
export default function Icon({ name, size = 18, ...rest }) {
  const Cmp = Lucide[name] || Lucide.Circle
  return <Cmp size={size} strokeWidth={2} {...rest} />
}
