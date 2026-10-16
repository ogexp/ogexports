import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LocalizedText as Text, LocalizedTextInput as TextInput } from '@/components/LocalizedText';
import { useColors } from '@/hooks/useColors';
import { GlassPopupSurface } from '@/components/GlassPopupSurface';
import { COUNTRIES, countryLabelForValue, countrySections, type CountryOption } from '@/lib/countries';

export function CountryPicker({
  label,
  value,
  onChange,
  placeholder = 'Select country',
  testID = 'country-picker',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const sections = useMemo(() => countrySections(query), [query]);
  const selectedLabel = countryLabelForValue(value);
  const selectedCountry = COUNTRIES.find(country => country.label === selectedLabel);

  function openPicker() {
    setQuery('');
    setSearchFocused(false);
    setVisible(true);
  }

  function closePicker() {
    setVisible(false);
    setQuery('');
    setSearchFocused(false);
  }

  function selectCountry(country: CountryOption) {
    onChange(country.label);
    closePicker();
  }

  return <>
    <View style={{ gap: 7, marginBottom: 14 }}>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <Pressable
        testID={`${testID}-trigger`}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel || placeholder}`}
        accessibilityHint="Opens a searchable country list"
        accessibilityState={{ expanded: visible }}
        onPress={openPicker}
        style={({ pressed }) => ({
          minHeight: 58,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: colors.radius,
          backgroundColor: colors.card,
          opacity: pressed ? 0.84 : 1,
        })}
      >
        <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.lightGreen }}>
          <Feather name="globe" size={17} color={colors.primary} />
        </View>
        <Text numberOfLines={1} style={{ flex: 1, color: selectedLabel ? colors.foreground : colors.mutedForeground, fontSize: 14, fontWeight: selectedLabel ? '600' : '400' }}>
          {selectedLabel || placeholder}
        </Text>
        {selectedCountry?.code ? <View style={{ minWidth: 38, height: 28, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.secondary }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>{selectedCountry.code}</Text>
        </View> : null}
        <Feather name="chevron-down" size={17} color={colors.mutedForeground} />
      </Pressable>
    </View>

    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={closePicker}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          testID={`${testID}-backdrop`}
          accessibilityRole="button"
          accessibilityLabel="Close country selector"
          onPress={closePicker}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.shadowColor, opacity: 0.44 }]}
        />
        <KeyboardAvoidingView behavior="padding" style={{ width: '100%', maxHeight: '92%' }}>
          <GlassPopupSurface style={{
            height: Math.min(height * 0.9, 740),
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 14),
            borderTopWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{ alignItems: 'center', paddingBottom: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 17 }}>
              <View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginRight: 12, backgroundColor: colors.lightGreen }}>
                <Feather name="globe" size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 3 }}>OG EXPORTS</Text>
                <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>Select country</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>Search by country name or ISO code</Text>
              </View>
              <Pressable
                testID={`${testID}-close`}
                accessibilityRole="button"
                accessibilityLabel="Close country selector"
                hitSlop={10}
                onPress={closePicker}
                style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.secondary }}
              >
                <Feather name="x" size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={{
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              marginHorizontal: 20,
              marginBottom: 8,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: searchFocused ? colors.primary : colors.input,
              borderRadius: colors.radius,
              backgroundColor: colors.card,
            }}>
              <Feather name="search" size={17} color={searchFocused ? colors.primary : colors.mutedForeground} />
              <TextInput
                testID={`${testID}-search`}
                accessibilityLabel="Search countries"
                value={query}
                onChangeText={setQuery}
                placeholder="Search country or code"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{ flex: 1, minHeight: 48, color: colors.foreground, fontSize: 14, outlineWidth: 0 }}
              />
              {query ? <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear country search"
                onPress={() => setQuery('')}
                hitSlop={8}
              >
                <Feather name="x-circle" size={17} color={colors.mutedForeground} />
              </Pressable> : null}
            </View>

            <SectionList<CountryOption>
              testID={`${testID}-list`}
              sections={sections}
              keyExtractor={item => item.code || 'other'}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              stickySectionHeadersEnabled={false}
              initialNumToRender={18}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 14, flexGrow: 1 }}
              renderSectionHeader={({ section }) => <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 10,
                paddingTop: 12,
                paddingBottom: 8,
              }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '800', letterSpacing: 0.9 }}>
                  {section.title}
                </Text>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
              </View>}
              ListEmptyComponent={<View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 42 }}>
                <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.lightGreen }}>
                  <Feather name="search" size={20} color={colors.primary} />
                </View>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', marginTop: 12 }}>No country found</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>Try another name or country code.</Text>
              </View>}
              renderItem={({ item }) => {
                const selected = selectedLabel === item.label;
                return <Pressable
                  testID={`${testID}-option-${item.code || 'other'}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${item.label}${item.code ? `, ${item.code}` : ''}`}
                  onPress={() => selectCountry(item)}
                  style={({ pressed }) => ({
                    minHeight: 60,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 10,
                    borderRadius: colors.radius,
                    backgroundColor: selected ? colors.lightGreen : pressed ? colors.secondary : 'transparent',
                  })}
                >
                  <View style={{
                    minWidth: 42,
                    height: 36,
                    paddingHorizontal: 7,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.primary : colors.card,
                  }}>
                    <Text style={{ color: selected ? colors.primaryForeground : colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>{item.code || '—'}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontSize: 14, fontWeight: selected ? '700' : '500' }}>
                    {item.label}
                  </Text>
                  {selected ? <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.card }}>
                    <Feather name="check" size={16} color={colors.primary} />
                  </View> : <View style={{ width: 28, height: 28 }} />}
                </Pressable>;
              }}
            />
          </GlassPopupSurface>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </>;
}
