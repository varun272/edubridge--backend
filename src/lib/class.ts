import { ClassModel } from '../models/index.js'

/** Find or create a Class document for grade+section within an institution */
export async function findOrCreateClass(
  institutionId: string,
  grade: string,
  section: string
) {
  const g = grade.trim()
  const s = section.trim().toUpperCase()
  const name = `${g}${s}`

  let cls = await ClassModel.findOne({ institutionId, grade: g, section: s })
  if (!cls) {
    cls = await ClassModel.create({
      institutionId,
      grade: g,
      section: s,
      name,
    })
  }
  return cls
}
