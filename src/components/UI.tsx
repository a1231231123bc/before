import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors as c, fonts as f } from '../theme';

export type IconName =
  | 'plus'
  | 'arrow'
  | 'back'
  | 'close'
  | 'camera'
  | 'image'
  | 'compare'
  | 'leaf'
  | 'grid'
  | 'info'
  | 'trash'
  | 'edit'
  | 'check'
  | 'share'
  | 'lock'
  | 'search';
export function Icon({
  name,
  size = 22,
  color = c.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, string> = {
    plus: 'M12 5v14M5 12h14',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    back: 'M19 12H5m6-6-6 6 6 6',
    close: 'm6 6 12 12M6 18 18 6',
    camera: 'M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v12H3V7a1 1 0 0 1 1-1Z',
    image:
      'm3 17 6-6 4 4 3-3 5 5M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
    compare:
      'M12 2v20M8 5H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4m8-14h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4',
    leaf: 'M20 3C8 2 3 8 5 15c2 7 15 6 15-12ZM4 21 15 10',
    edit: 'm15 4 5 5M4 20l1-6L16 3l5 5L10 19l-6 1Z',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    check: 'm5 12 4 4L19 6',
    share: 'M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z',
    search: 'm16 16 5 5',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'grid' ? (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={1.5} />
          <Rect x={14} y={3} width={7} height={7} rx={1.5} />
          <Rect x={3} y={14} width={7} height={7} rx={1.5} />
          <Rect x={14} y={14} width={7} height={7} rx={1.5} />
        </>
      ) : name === 'info' ? (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 11v6M12 7h.01" />
        </>
      ) : (
        <Path d={paths[name]} />
      )}
      {name === 'camera' && <Circle cx={12} cy={12} r={3.5} />}
      {name === 'image' && <Circle cx={15.5} cy={7.5} r={1} />}
      {name === 'search' && <Circle cx={10.5} cy={10.5} r={7} />}
    </Svg>
  );
}

export function Label({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <Text style={[s.label, light && { color: '#DAE2D3' }]}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  icon,
  tone = 'primary',
  disabled = false,
  busy = false,
  small = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
}) {
  const dark = tone === 'primary' || tone === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        small && s.smallButton,
        tone === 'secondary' && s.secondary,
        tone === 'ghost' && s.ghost,
        tone === 'danger' && { backgroundColor: c.danger },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={dark ? c.white : c.ink} />
      ) : icon ? (
        <Icon name={icon} size={19} color={dark ? c.white : c.ink} />
      ) : null}
      <Text style={[s.buttonText, !dark && { color: c.ink }]}>{title}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  dark = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.iconButton,
        dark && { backgroundColor: c.dark },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon name={name} color={dark ? c.white : c.ink} />
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 9 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#93978A"
        style={[
          s.input,
          props.multiline && { minHeight: 108, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function Sheet({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.overlay}
      >
        <View accessibilityViewIsModal style={[s.sheet, wide && { maxWidth: 620 }]}>
          <View style={s.sheetHeader}>
            <Text accessibilityRole="header" style={s.sheetTitle}>
              {title}
            </Text>
            <IconButton name="close" label="Close dialog" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 22 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const s = StyleSheet.create({
  label: {
    fontFamily: f.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: c.muted,
    textTransform: 'uppercase',
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: c.accent,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  smallButton: { minHeight: 44, paddingVertical: 11, paddingHorizontal: 17, borderRadius: 13 },
  buttonText: { fontFamily: f.bold, fontSize: 14, color: c.white },
  secondary: { backgroundColor: c.sage },
  ghost: { backgroundColor: 'transparent' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.paper,
    borderColor: c.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { fontFamily: f.bold, fontSize: 13, color: c.ink },
  input: {
    fontFamily: f.regular,
    fontSize: 16,
    color: c.ink,
    padding: 15,
    backgroundColor: c.background,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.line,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#19241E77',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 25,
    backgroundColor: c.paper,
    overflow: 'hidden',
    flexShrink: 1,
  },
  sheetHeader: {
    padding: 21,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: c.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetTitle: { fontFamily: f.serif, fontSize: 28, color: c.ink, flexShrink: 1 },
  body: { fontFamily: f.regular, fontSize: 15, lineHeight: 23, color: c.muted },
  title: { fontFamily: f.serif, fontSize: 38, lineHeight: 42, color: c.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
