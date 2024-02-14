import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {

  if (!(await knex.schema.hasTable('concept'))) {
    await knex.schema.createTable('concept', table => {
      table.increments('id')
      table.text('name').notNullable().unique()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('theme'))) {
    await knex.schema.createTable('theme', table => {
      table.increments('id')
      table.text('name').notNullable().unique()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('concept_theme'))) {
    await knex.schema.createTable('concept_theme', table => {
      table.increments('id')
      table.integer('concept_id').unsigned().notNullable().references('concept.id')
      table.integer('theme_id').unsigned().notNullable().references('theme.id')
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('concept_compare'))) {
    await knex.schema.createTable('concept_compare', table => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('user.id')
      table.integer('small_id').unsigned().notNullable().references('concept.id')
      table.integer('large_id').unsigned().notNullable().references('concept.id')
      table.timestamps(false, true)
    })
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('concept_compare')
  await knex.schema.dropTableIfExists('concept_theme')
  await knex.schema.dropTableIfExists('theme')
  await knex.schema.dropTableIfExists('concept')
}
