import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LocalizedText as Text, LocalizedTextInput as TextInput } from '@/components/LocalizedText';
import { useColors } from '@/hooks/useColors';
import { countryLabelForValue, searchCountries, type CountryOption } from '@/lib/countries';

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
  const results = useMemo(() => searchCountries(query), [query]);
  const selectedLabel = countryLabelForValue(value);

  function openPicker() {
    setQuery('');
    setVisible(true);
  }

  function selectCountry(country: CountryOption) {
    onChange(country.label);
    setVisible(false);
    setQuery('');
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
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.input,
          borderRadius: 13,
          backgroundColor: colors.card,
          opacity: pressed ? 0.84 : 1,
        })}
      >
        <Feather name="globe" size={17} color={colors.primary} />
        <Text numberOfLines={1} style={{ flex: 1, color: selectedLabel ? colors.foreground : colors.mutedForeground, fontSize: 14 }}>
          {selectedLabel || placeholder}
        </Text>
        <Feather name="chevron-down" size={17} color={colors.mutedForeground} />
      </Pressable>
    </View>

    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => setVisible(false)}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          testID={`${testID}-backdrop`}
          accessibilityRole="button"
          accessibilityLabel="Close country selector"
          onPress={() => setVisible(false)}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.shadowColor, opacity: 0.44 }]}
        />
        <KeyboardAvoidingView behavior="padding" style={{ width: '100%', maxHeight: '92%' }}>
          <View style={{
            height: Math.min(height * 0.88, 720),
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{ alignItems: 'center', paddingBottom: 12 }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>Select country</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>Search by country name or ISO code</Text>
              </View>
              <Pressable
                testID={`${testID}-close`}
                accessibilityRole="button"
                accessibilityLabel="Close country selector"
                hitSlop={10}
                onPress={() => setVisible(false)}
                style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.secondary }}
              >
                <Feather name="x" size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginHorizontal: 20,
              marginBottom: 10,
              paddingHorizontal: 13,
              borderWidth: 1,
              borderColor: colors.input,
              borderRadius: 13,
              backgroundColor: colors.card,
            }}>
              <Feather name="search" size={17} color={colors.mutedForeground} />
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
                style={{ flex: 1, minHeight: 46, color: colors.foreground, fontSize: 14, outlineWidth: 0 }}
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

            <FlatList
              testID={`${testID}-list`}
              data={results}
              keyExtractor={item => item.code || 'other'}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={18}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, flexGrow: 1 }}
              ListEmptyComponent={<View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 42 }}>
                <Feather name="search" size={24} color={colors.mutedForeground} />
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
                    minHeight: 58,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 9,
                    borderRadius: 13,
                    backgroundColor: selected ? colors.lightGreen : pressed ? colors.secondary : 'transparent',
                  })}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.secondary,
                  }}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{item.code || '··'}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontSize: 14, fontWeight: selected ? '700' : '500' }}>
                    {item.label}
                  </Text>
                  {selected ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </Pressable>;
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </>;
}
