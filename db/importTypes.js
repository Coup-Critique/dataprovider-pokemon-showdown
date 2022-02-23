const fs = require('fs')
const { knex } = require("./db")
let typesWeaknesses = {};
let records = { table: 'type', CREATED: 0, UPDATED: 0 }
const objects = require('./types').flatMap((object) => object.gen.map((gen) => ({...object,gen})))

module.exports.execute = () => Promise.all(objects.map(async (object) => {
    const {name,gen,weaknesses} = object
    const type = await knex('type').where({name,gen}).first(['id'])
    let typeId = null;
    if(type){
        typeId = type.id;
        await knex('type').update({name,gen}).where({id: typeId})
        records.UPDATED++
    }else{
        typeId = await knex('type').insert({name,gen},['id'])
        records.CREATED++
    }
    if(weaknesses.length > 0)
        typesWeaknesses[typeId] = weaknesses
})).then(async () => {
    console.log(records)
    records = { table: 'weakness', CREATED: 0 }
    for(const [id,weaknesses] of Object.entries(typesWeaknesses))
    {
        const type = await knex('type').where({id}).first()
        for(const weakness of weaknesses)
        {
            const typeAttacker = await knex('type').where({name: weakness.name, gen: type.gen}).first()
            if(!typeAttacker){
                console.log(`Pas de type attacker ${weakness.name}`)
                continue;
            }
            const existantWeakness = await knex('weakness').where({type_defender_id: type.id, type_attacker_id: typeAttacker.id, gen: type.gen}).first()
            if(existantWeakness)
                continue;
            
            await knex('weakness').insert({type_defender_id: type.id, type_attacker_id: typeAttacker.id, gen: type.gen, ratio: weakness.ratio})
            records.CREATED++
        }
    }
}).then(() => console.log(records))
  .finally(() => knex.destroy())