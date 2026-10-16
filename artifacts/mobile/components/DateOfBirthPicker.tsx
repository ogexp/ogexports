import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useOptionalAppPreferences } from '@/context/AppPreferencesContext';
import { useColors } from '@/hooks/useColors';
import { GlassPopupSurface } from '@/components/GlassPopupSurface';
import { translateUi, type AppLanguage } from '@/lib/strings';
import {
  formatDateOnly,
  formatDateOnlyForLocale,
  getCalendarGrid,
  getTodayParts,
  isDateAfter,
  MIN_BIRTH_YEAR,
  parseDateOnly,
  shiftCalendarMonth,
  type DateOnlyParts,
} from '@/lib/date-of-birth';

type DateOfBirthPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testID?: string;
};

function localeForLanguage(language: AppLanguage): string {
  if (language === 'ur') return 'ur-PK';
  if (language === 'ar') return 'ar';
  return 'en-US';
}

function calendarDate(year: number, month: number, day: number): Date {
  const date = new Date(2000, month - 1, day, 12);
  date.setFullYear(year);
  return date;
}

export function DateOfBirthPicker({
  label,
  value,
  onChange,
  testID = 'date-of-birth',
}: DateOfBirthPickerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const preferences = useOptionalAppPreferences();
  const language = preferences?.preferences.language ?? 'en';
  const isRTL = preferences?.isRTL ?? (language === 'ur' || language === 'ar');
  const locale = localeForLanguage(language);
  const today = getTodayParts();
  const selectedValue = parseDateOnly(value);
  const minimumYear = Math.min(MIN_BIRTH_YEAR, selectedValue?.year ?? MIN_BIRTH_YEAR);
  const [visible, setVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: today.year,
    month: today.month,
  }));
  const [draftDate, setDraftDate] = useState<DateOnlyParts | null>(null);
  const [showYears, setShowYears] = useState(false);

  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(calendarDate(calendarMonth.year, calendarMonth.month, 1));
  const displayedValue = selectedValue ? formatDateOnlyForLocale(value, locale) : '';
  const selectedDraftValue = draftDate ? formatDateOnly(draftDate) : '';
  const selectedDraftLabel = selectedDraftValue
    ? formatDateOnlyForLocale(selectedDraftValue, locale)
    : '';
  const calendarDays = useMemo(
    () => getCalendarGrid(calendarMonth.year, calendarMonth.month),
    [calendarMonth.month, calendarMonth.year],
  );
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const sunday = calendarDate(2023, 1, 1);
    sunday.setDate(sunday.getDate() + index);
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(sunday);
  }), [locale]);
  const years = useMemo(
    () => Array.from({ length: Math.max(0, today.year - minimumYear + 1) }, (_, index) => today.year - index),
    [minimumYear, today.year],
  );
  const initialYearIndex = Math.max(0, years.indexOf(calendarMonth.year));
  const canGoToPreviousMonth = calendarMonth.year > minimumYear || calendarMonth.month > 1;
  const canGoToNextMonth = calendarMonth.year < today.year
    || (calendarMonth.year === today.year && calendarMonth.month < today.month);
  const previousMonthIcon = isRTL ? 'chevron-right' : 'chevron-left';
  const nextMonthIcon = isRTL ? 'chevron-left' : 'chevron-right';

  function translate(value: string) {
    return translateUi(value, language);
  }

  function openPicker() {
    const date = parseDateOnly(value);
    const initialDate = date ?? today;
    setCalendarMonth({ year: initialDate.year, month: initialDate.month });
    setDraftDate(date);
    setShowYears(false);
    setVisible(true);
  }

  function closePicker() {
    setVisible(false);
    setShowYears(false);
  }

  function moveMonth(offset: number) {
    const next = shiftCalendarMonth(calendarMonth, offset);
    if (next.year < minimumYear || isDateAfter({ ...next, day: 1 }, today)) return;
    setCalendarMonth({ year: next.year, month: next.month });
  }

  function selectYear(year: number) {
    setCalendarMonth(current => ({ ...current, year }));
    setShowYears(false);
  }

  function selectDay(day: number) {
    const date = { year: calendarMonth.year, month: calendarMonth.month, day };
    if (date.year < minimumYear || isDateAfter(date, today)) return;
    setDraftDate(date);
  }

  function confirmDate() {
    if (!draftDate) return;
    onChange(formatDateOnly(draftDate));
    closePicker();
  }

  const sheetHeight = Math.min(height * 0.92, 720);

  return <>
    <View style={{ gap: 7, marginBottom: 14 }}>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <Pressable
        testID={`${testID}-trigger`}
        accessibilityRole="button"
        accessibilityLabel={translate(displayedValue ? `${label}: ${displayedValue}` : label)}
        accessibilityHint={translate('Open date picker')}
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
          <Feather name="calendar" size={17} color={colors.primary} />
        </View>
        <Text numberOfLines={1} style={{
          flex: 1,
          color: displayedValue ? colors.foreground : colors.mutedForeground,
          fontSize: 14,
          fontWeight: displayedValue ? '600' : '400',
        }}>
          {displayedValue || 'Select date of birth'}
        </Text>
        <Feather name="chevron-down" size={17} color={colors.mutedForeground} />
      </Pressable>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>
        Tap to open the calendar.
      </Text>
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
          accessibilityLabel={translate('Close date picker')}
          onPress={closePicker}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.shadowColor, opacity: 0.44 }]}
        />
        <GlassPopupSurface style={{
          width: '100%',
          maxWidth: 520,
          height: sheetHeight,
          maxHeight: '92%',
          alignSelf: 'center',
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 14),
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 16,
        }}>
          <View style={{ alignItems: 'center', paddingBottom: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 }}>
            <View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginRight: 12, backgroundColor: colors.lightGreen }}>
              <Feather name="calendar" size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 3 }}>
                OG EXPORTS
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>
                Select date of birth
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
                Choose a day from the calendar.
              </Text>
            </View>
            <Pressable
              testID={`${testID}-close`}
              accessibilityRole="button"
              accessibilityLabel={translate('Close date picker')}
              hitSlop={10}
              onPress={closePicker}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginHorizontal: 20,
            marginBottom: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: colors.radius,
            backgroundColor: colors.lightGreen,
          }}>
            <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.card }}>
              <Feather name="check" size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>
                Selected date
              </Text>
              <Text style={{ color: selectedDraftLabel ? colors.foreground : colors.mutedForeground, fontSize: 15, fontWeight: '700', marginTop: 3 }}>
                {selectedDraftLabel || 'Choose a day'}
              </Text>
            </View>
          </View>

          {showYears ? <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 8 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>
                Select birth year
              </Text>
              <Pressable
                testID={`${testID}-back-to-calendar`}
                accessibilityRole="button"
                accessibilityLabel={translate('Back to calendar')}
                onPress={() => setShowYears(false)}
                style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 }}
              >
                <Feather name="calendar" size={15} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Back to calendar</Text>
              </Pressable>
            </View>
            <FlatList<number>
              testID={`${testID}-years`}
              data={years}
              keyExtractor={year => String(year)}
              numColumns={4}
              initialScrollIndex={initialYearIndex}
              getItemLayout={(_data, index) => ({
                length: 48,
                offset: Math.floor(index / 4) * 48,
                index,
              })}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: year }) => {
                const selected = calendarMonth.year === year;
                return <Pressable
                  testID={`${testID}-year-${year}`}
                  accessibilityRole="button"
                  accessibilityLabel={String(year)}
                  accessibilityState={{ selected }}
                  onPress={() => selectYear(year)}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 42,
                    marginHorizontal: 3,
                    marginVertical: 3,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: selected ? 1 : 0,
                    borderColor: colors.primary,
                    borderRadius: 14,
                    backgroundColor: selected ? colors.lightGreen : pressed ? colors.secondary : 'transparent',
                  })}
                >
                  <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 14, fontWeight: selected ? '700' : '500' }}>
                    {new Intl.NumberFormat(locale, { useGrouping: false }).format(year)}
                  </Text>
                </Pressable>;
              }}
            />
          </> : <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
              <Pressable
                testID={`${testID}-previous-month`}
                accessibilityRole="button"
                accessibilityLabel={translate('Previous month')}
                accessibilityState={{ disabled: !canGoToPreviousMonth }}
                disabled={!canGoToPreviousMonth}
                onPress={() => moveMonth(-1)}
                hitSlop={8}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canGoToPreviousMonth ? 1 : 0.35 }}
              >
                <Feather name={previousMonthIcon} size={19} color={colors.foreground} />
              </Pressable>
              <Pressable
                testID={`${testID}-select-year`}
                accessibilityRole="button"
                accessibilityLabel={`${translate('Select birth year')}: ${calendarMonth.year}`}
                accessibilityState={{ expanded: showYears }}
                onPress={() => setShowYears(true)}
                style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 }}
              >
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{monthTitle}</Text>
                <Feather name="chevron-down" size={15} color={colors.primary} />
              </Pressable>
              <Pressable
                testID={`${testID}-next-month`}
                accessibilityRole="button"
                accessibilityLabel={translate('Next month')}
                accessibilityState={{ disabled: !canGoToNextMonth }}
                disabled={!canGoToNextMonth}
                onPress={() => moveMonth(1)}
                hitSlop={8}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canGoToNextMonth ? 1 : 0.35 }}
              >
                <Feather name={nextMonthIcon} size={19} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 3 }}>
              {weekdays.map((weekday, index) => <View key={`${weekday}-${index}`} style={{ width: `${100 / 7}%`, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700' }}>{weekday}</Text>
              </View>)}
            </View>

            <View
              testID={`${testID}-calendar-grid`}
              accessibilityLabel={`${monthTitle} calendar`}
              style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 }}
            >
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 38 }} />;
                }

                const date = { year: calendarMonth.year, month: calendarMonth.month, day };
                const isSelected = draftDate?.year === date.year
                  && draftDate.month === date.month
                  && draftDate.day === date.day;
                const disabled = date.year < minimumYear || isDateAfter(date, today);
                const dateValue = formatDateOnly(date);
                return <Pressable
                  key={dateValue}
                  testID={`${testID}-day-${dateValue}`}
                  accessibilityRole="button"
                  accessibilityLabel={formatDateOnlyForLocale(dateValue, locale)}
                  accessibilityState={{ selected: isSelected, disabled }}
                  disabled={disabled}
                  onPress={() => selectDay(day)}
                  style={({ pressed }) => ({
                    width: `${100 / 7}%`,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: disabled ? 0.35 : pressed ? 0.65 : 1,
                  })}
                >
                  <View style={{
                    width: 34,
                    height: 34,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isSelected ? 1 : 0,
                    borderColor: colors.primary,
                    borderRadius: 17,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  }}>
                    <Text style={{ color: isSelected ? colors.primaryForeground : colors.foreground, fontSize: 13, fontWeight: isSelected ? '700' : '500' }}>
                      {new Intl.NumberFormat(locale, { useGrouping: false }).format(day)}
                    </Text>
                  </View>
                </Pressable>;
              })}
            </View>
          </>}

          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 10 }}>
            <Pressable
              testID={`${testID}-cancel`}
              accessibilityRole="button"
              onPress={closePicker}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: colors.radius,
                backgroundColor: colors.card,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              testID={`${testID}-confirm`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !draftDate }}
              disabled={!draftDate}
              onPress={confirmDate}
              style={({ pressed }) => ({
                flex: 1.35,
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: colors.radius,
                backgroundColor: colors.primary,
                opacity: !draftDate ? 0.45 : pressed ? 0.88 : 1,
              })}
            >
              <Feather name="check" size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '700' }}>Use this date</Text>
            </Pressable>
          </View>
        </GlassPopupSurface>
      </View>
    </Modal>
  </>;
}
