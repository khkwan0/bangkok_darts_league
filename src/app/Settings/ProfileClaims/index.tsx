import {Redirect} from 'expo-router'

/** Legacy route — profile claims live under Admin. */
export default function ProfileClaimsScreen() {
  return <Redirect href="/Settings/Admin/PlayerClaims" />
}
