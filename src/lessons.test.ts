import { describe, expect, it } from 'vitest'
import { sortLessonNames, titleFromFile } from './lessons'

describe('lesson file helpers', () => {
  it('creates a readable lesson title', () => {
    expect(titleFromFile('03-At_the_Cafe.mp3')).toBe('At the Cafe')
  })

  it('sorts numbered lessons naturally', () => {
    expect(sortLessonNames(['Lesson 10.mp3', 'Lesson 2.mp3', 'Lesson 1.mp3'], 'en'))
      .toEqual(['Lesson 1.mp3', 'Lesson 2.mp3', 'Lesson 10.mp3'])
  })
})
