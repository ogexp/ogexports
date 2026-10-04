import { InvestFacilityProjectPage } from "@/components/invest/InvestFacilityProjectPage"
import { PLANT_CONFIG } from "@/data/invest-plant"

export default function InvestPlant() {
  return <InvestFacilityProjectPage config={PLANT_CONFIG} />
}
