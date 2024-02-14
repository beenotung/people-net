import { seedRow } from 'better-sqlite3-proxy'
import { proxy } from './proxy'
import { config as loadEnv } from 'dotenv'

// This file serve like the knex seed file.
//
// You can setup the database with initial config and sample data via the db proxy.

function seedWords(input: { theme: string; words: string }) {
  let theme_id = seedRow(proxy.theme, { name: input.theme })
  input.words
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .forEach(word => {
      let concept_id = seedRow(proxy.concept, { name: word })
      seedRow(proxy.concept_theme, { theme_id, concept_id })
    })
}

seedWords({
  theme: 'tech',
  words:
    'Typescript, Javascript, AI, Python, Image AI, NLP AI, Audio AI, Generative AI, quality, consistency, passion, commitment, challenging, simple, efficiency, maintainability, scalability, reliability, cost, performance, uniqueness, innovation, creativity, safety, speed to market, ease of changes, iteration speed',
})

seedWords({
  theme: 'startup',
  words:
    'medical tech, animal tech, sense tech, wireless sensing, signal processing, math, learning, growth, API, interoperability, openness, diversity, monopoly, cheap, popular, feeling, experience, result, ethic, helpful, technology, culture, tradition,  regulation, emotion, animation, style',
})
