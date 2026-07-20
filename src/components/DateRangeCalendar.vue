<template>
  <div class="date-range-calendar">
    <div class="selected-range">
      <div class="selected-range-inputs">
        <input
          v-model.trim="inputStart"
          class="date-input"
          type="text"
          inputmode="numeric"
          :aria-label="startDateLabel"
          @change="handleManualInput"
        >
        <span class="date-range-separator">{{ rangeSeparator }}</span>
        <input
          v-model.trim="inputEnd"
          class="date-input"
          type="text"
          inputmode="numeric"
          :aria-label="endDateLabel"
          @change="handleManualInput"
        >
      </div>
    </div>

    <div class="calendar-header">
      <button type="button" class="calendar-nav" :aria-label="previousMonthLabel" @click="goToPreviousMonth">
        <font-awesome-icon icon="chevron-left" />
      </button>
      <div class="calendar-title">{{ monthTitle }}</div>
      <button type="button" class="calendar-nav" :aria-label="nextMonthLabel" @click="goToNextMonth">
        <font-awesome-icon icon="chevron-right" />
      </button>
    </div>

    <div class="calendar-weekdays">
      <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
    </div>

    <div class="calendar-grid">
      <button
        v-for="day in calendarDays"
        :key="day.key"
        type="button"
        class="calendar-day"
        :class="{
          'is-muted': !day.isCurrentMonth,
          'is-today': day.isToday,
          'is-range-start': day.key === draftStart,
          'is-range-end': day.key === draftEnd,
          'is-in-range': isInRange(day.key)
        }"
        @click="selectDay(day.key)"
      >
        {{ day.dayOfMonth }}
      </button>
    </div>
  </div>
</template>

<script>
const DAY_MS = 24 * 60 * 60 * 1000

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function parseDateKey(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }

  date.setHours(0, 0, 0, 0)
  return date
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export default {
  name: 'DateRangeCalendar',
  props: {
    modelValue: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return {
      displayYear: today.getFullYear(),
      displayMonth: today.getMonth(),
      draftStart: '',
      draftEnd: '',
      inputStart: '',
      inputEnd: '',
      awaitingEnd: false
    }
  },
  computed: {
    previousMonthLabel() {
      return this.$t('dateRangeCalendar.previousMonth')
    },
    nextMonthLabel() {
      return this.$t('dateRangeCalendar.nextMonth')
    },
    startDateLabel() {
      return this.$t('dateRangeCalendar.startDate')
    },
    endDateLabel() {
      return this.$t('dateRangeCalendar.endDate')
    },
    rangeSeparator() {
      return this.$t('dateRangeCalendar.rangeSeparator')
    },
    monthTitle() {
      return this.$t('dateRangeCalendar.monthTitle', {
        year: this.displayYear,
        month: padDatePart(this.displayMonth + 1)
      })
    },
    weekdayLabels() {
      return [
        this.$t('dateRangeCalendar.weekdaySun'),
        this.$t('dateRangeCalendar.weekdayMon'),
        this.$t('dateRangeCalendar.weekdayTue'),
        this.$t('dateRangeCalendar.weekdayWed'),
        this.$t('dateRangeCalendar.weekdayThu'),
        this.$t('dateRangeCalendar.weekdayFri'),
        this.$t('dateRangeCalendar.weekdaySat')
      ]
    },
    calendarDays() {
      const monthStart = new Date(this.displayYear, this.displayMonth, 1)
      const start = new Date(this.displayYear, this.displayMonth, 1 - monthStart.getDay())
      const todayKey = formatDateKey(new Date())

      return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start.getTime() + index * DAY_MS)
        const key = formatDateKey(date)
        return {
          key,
          dayOfMonth: date.getDate(),
          isCurrentMonth: date.getMonth() === this.displayMonth,
          isToday: key === todayKey
        }
      })
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(value) {
        this.syncFromModel(value)
      }
    }
  },
  methods: {
    syncFromModel(value) {
      const startDate = parseDateKey(value?.[0])
      const endDate = parseDateKey(value?.[1])

      this.draftStart = startDate ? formatDateKey(startDate) : ''
      this.draftEnd = endDate ? formatDateKey(endDate) : ''
      this.inputStart = this.draftStart
      this.inputEnd = this.draftEnd
      this.awaitingEnd = false

      const displayDate = startDate || endDate
      if (displayDate) {
        this.displayYear = displayDate.getFullYear()
        this.displayMonth = displayDate.getMonth()
      }
    },
    goToPreviousMonth() {
      const date = shiftMonth(new Date(this.displayYear, this.displayMonth, 1), -1)
      this.displayYear = date.getFullYear()
      this.displayMonth = date.getMonth()
    },
    goToNextMonth() {
      const date = shiftMonth(new Date(this.displayYear, this.displayMonth, 1), 1)
      this.displayYear = date.getFullYear()
      this.displayMonth = date.getMonth()
    },
    selectDay(key) {
      if (!this.draftStart || this.draftEnd || !this.awaitingEnd) {
        this.draftStart = key
        this.draftEnd = ''
        this.inputStart = key
        this.inputEnd = ''
        this.awaitingEnd = true
        return
      }

      const range = key < this.draftStart ? [key, this.draftStart] : [this.draftStart, key]
      this.draftStart = range[0]
      this.draftEnd = range[1]
      this.inputStart = range[0]
      this.inputEnd = range[1]
      this.awaitingEnd = false
      this.commitRange(range)
    },
    handleManualInput() {
      const startDate = parseDateKey(this.inputStart)
      const endDate = parseDateKey(this.inputEnd)
      if (!startDate || !endDate) return

      const startKey = formatDateKey(startDate)
      const endKey = formatDateKey(endDate)
      const range = startKey <= endKey ? [startKey, endKey] : [endKey, startKey]

      this.draftStart = range[0]
      this.draftEnd = range[1]
      this.inputStart = range[0]
      this.inputEnd = range[1]
      this.awaitingEnd = false

      this.displayYear = startDate.getFullYear()
      this.displayMonth = startDate.getMonth()
      this.commitRange(range)
    },
    commitRange(range) {
      this.$emit('update:modelValue', range)
      this.$emit('change', range)
    },
    isInRange(key) {
      return Boolean(this.draftStart && this.draftEnd && key > this.draftStart && key < this.draftEnd)
    }
  }
}
</script>

<style scoped>
.date-range-calendar {
  width: min(336px, 100%);
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  color: var(--admin-container-color);
  user-select: none;
}

.selected-range {
  margin-bottom: 16px;
}

.selected-range-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.date-input {
  width: 100%;
  min-width: 0;
  height: 34px;
  box-sizing: border-box;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 0 8px;
  background: var(--glass-bg);
  color: var(--admin-container-color);
  font-size: 13px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.date-input:hover,
.date-input:focus {
  border-color: var(--el-color-primary);
  box-shadow: none;
}

.date-range-separator {
  color: #59636E;
  font-size: 12px;
  font-weight: 700;
}

.calendar-header {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.calendar-title {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
}

.calendar-nav {
  width: 36px;
  height: 36px;
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  background: var(--glass-bg);
  color: var(--admin-container-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.calendar-nav:hover,
.calendar-nav:focus {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  background: rgba(37, 99, 235, 0.08);
  box-shadow: none;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-weekdays {
  margin-bottom: 8px;
  color: #59636E;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.calendar-weekdays span {
  height: 24px;
  line-height: 24px;
}

.calendar-grid {
  gap: 4px;
}

.calendar-day {
  position: relative;
  height: 38px;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--admin-container-color);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.calendar-day:hover,
.calendar-day:focus {
  border-color: rgba(37, 99, 235, 0.45);
  background: rgba(37, 99, 235, 0.1);
  color: var(--el-color-primary);
}

.calendar-day.is-muted {
  color: #86909C;
  opacity: 0.62;
}

.calendar-day.is-today {
  border-color: rgba(249, 115, 22, 0.7);
}

.calendar-day.is-in-range {
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.12);
  color: var(--el-color-primary);
}

.calendar-day.is-range-start,
.calendar-day.is-range-end {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  box-shadow: none;
}

html.dark .calendar-weekdays {
  color: #A1A1AA;
}

html.dark .calendar-day.is-muted {
  color: #737b88;
}
</style>
