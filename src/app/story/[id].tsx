import { useLocalSearchParams } from 'expo-router';
import { BeforeApp } from '../../../App';
export default function StoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BeforeApp screen={{ name: 'story', id }} />;
}
