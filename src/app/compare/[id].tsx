import { useLocalSearchParams } from 'expo-router';
import { BeforeApp } from '../../../App';
export default function CompareRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BeforeApp screen={{ name: 'compare', id }} />;
}
