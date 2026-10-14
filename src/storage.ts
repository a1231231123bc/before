import AsyncStorage from '@react-native-async-storage/async-storage';
import { Journal, parseJournal } from './domain';

const KEY = '@before/journal/v1';
export async function loadJournal() {
  return parseJournal(await AsyncStorage.getItem(KEY));
}
export async function saveJournal(journal: Journal) {
  await AsyncStorage.setItem(KEY, JSON.stringify(journal));
}
