/**
 * Validation script to check province data integrity
 * Run with: npx tsx validate-provinces.ts
 */

import { PROVINCE_COORDINATES } from './src/data/provinceCoordinates'
import { PROVINCE_ADJACENCIES, PROVINCE_INFO } from './src/data/provinceData'
import { SCENARIO_SETUPS } from './src/data/scenarios'

console.log('🔍 Validating province data integrity...\n')

// Extract all province IDs from each source
const coordinateProvinces = new Set(Object.keys(PROVINCE_COORDINATES))
const adjacencyProvinces = new Set(Object.keys(PROVINCE_ADJACENCIES))
const infoProvinces = new Set(Object.keys(PROVINCE_INFO))

// Extract provinces referenced in scenarios
const scenarioProvinces = new Set<string>()
Object.values(SCENARIO_SETUPS).forEach(scenario => {
  Object.values(scenario).forEach(setup => {
    ;[...setup.cities, ...setup.garrison, ...setup.armies, ...setup.fleets].forEach(p =>
      scenarioProvinces.add(p)
    )
  })
})

// Extract provinces referenced in adjacencies
const referencedInAdjacencies = new Set<string>()
Object.values(PROVINCE_ADJACENCIES).forEach(adjacents => {
  adjacents.forEach(p => referencedInAdjacencies.add(p))
})

console.log('📊 Province counts:')
console.log(`  - Coordinates: ${coordinateProvinces.size}`)
console.log(`  - Adjacencies: ${adjacencyProvinces.size}`)
console.log(`  - Province Info: ${infoProvinces.size}`)
console.log(`  - Referenced in scenarios: ${scenarioProvinces.size}`)
console.log(`  - Referenced in adjacency lists: ${referencedInAdjacencies.size}`)
console.log()

// Check 1: All provinces in coordinates should have province info
console.log('✅ Check 1: Coordinates have province info')
const missingInfo = [...coordinateProvinces].filter(p => !infoProvinces.has(p))
if (missingInfo.length > 0) {
  console.error(`  ❌ Missing province info for: ${missingInfo.join(', ')}`)
} else {
  console.log(`  ✓ All ${coordinateProvinces.size} provinces have info`)
}
console.log()

// Check 2: All provinces in info should have coordinates
console.log('✅ Check 2: Province info has coordinates')
const missingCoords = [...infoProvinces].filter(p => !coordinateProvinces.has(p))
if (missingCoords.length > 0) {
  console.error(`  ❌ Missing coordinates for: ${missingCoords.join(', ')}`)
} else {
  console.log(`  ✓ All ${infoProvinces.size} provinces have coordinates`)
}
console.log()

// Check 3: All provinces in adjacencies should have province info
console.log('✅ Check 3: Adjacency keys have province info')
const adjacencyMissingInfo = [...adjacencyProvinces].filter(p => !infoProvinces.has(p))
if (adjacencyMissingInfo.length > 0) {
  console.error(`  ❌ Missing province info for adjacency keys: ${adjacencyMissingInfo.join(', ')}`)
} else {
  console.log(`  ✓ All ${adjacencyProvinces.size} adjacency keys have province info`)
}
console.log()

// Check 4: All provinces referenced in adjacency lists should exist
console.log('✅ Check 4: Adjacency references are valid')
const invalidAdjacencyRefs = [...referencedInAdjacencies].filter(p => !infoProvinces.has(p))
if (invalidAdjacencyRefs.length > 0) {
  console.error(`  ❌ Invalid adjacency references: ${invalidAdjacencyRefs.join(', ')}`)
} else {
  console.log(`  ✓ All ${referencedInAdjacencies.size} adjacency references are valid`)
}
console.log()

// Check 5: All scenario provinces should exist
console.log('✅ Check 5: Scenario provinces are valid')
const invalidScenarioProvinces = [...scenarioProvinces].filter(p => !infoProvinces.has(p))
if (invalidScenarioProvinces.length > 0) {
  console.error(`  ❌ Invalid scenario provinces: ${invalidScenarioProvinces.join(', ')}`)
} else {
  console.log(`  ✓ All ${scenarioProvinces.size} scenario provinces are valid`)
}
console.log()

// Check 6: Verify adjacencies are bidirectional
console.log('✅ Check 6: Adjacencies are bidirectional')
const unidirectional: string[] = []
Object.entries(PROVINCE_ADJACENCIES).forEach(([province, adjacents]) => {
  adjacents.forEach(adjacent => {
    const reverseAdjacents = PROVINCE_ADJACENCIES[adjacent]
    if (!reverseAdjacents || !reverseAdjacents.includes(province)) {
      unidirectional.push(`${province} → ${adjacent} (missing reverse)`)
    }
  })
})
if (unidirectional.length > 0) {
  console.error(`  ⚠️  Non-bidirectional adjacencies found:`)
  unidirectional.slice(0, 10).forEach(issue => console.error(`     - ${issue}`))
  if (unidirectional.length > 10) {
    console.error(`     ... and ${unidirectional.length - 10} more`)
  }
} else {
  console.log(`  ✓ All adjacencies are bidirectional`)
}
console.log()

// Check 7: Verify province types match adjacencies
console.log('✅ Check 7: Province types are consistent')
const typeIssues: string[] = []
Object.entries(PROVINCE_ADJACENCIES).forEach(([province, adjacents]) => {
  const info = PROVINCE_INFO[province]
  if (!info) return

  adjacents.forEach(adjacent => {
    const adjacentInfo = PROVINCE_INFO[adjacent]
    if (!adjacentInfo) return

    // Armies can't move directly to sea zones (unless province is a port)
    if (info.type === 'land' && adjacentInfo.type === 'sea') {
      // This is ok only if the land province is a port
      if (!info.isPort) {
        typeIssues.push(`${province} (land, no port) → ${adjacent} (sea)`)
      }
    }
  })
})
if (typeIssues.length > 0) {
  console.log(`  ⚠️  Potential type inconsistencies (may be intentional):`)
  typeIssues.slice(0, 5).forEach(issue => console.log(`     - ${issue}`))
  if (typeIssues.length > 5) {
    console.log(`     ... and ${typeIssues.length - 5} more`)
  }
} else {
  console.log(`  ✓ No obvious type inconsistencies`)
}
console.log()

// Summary
console.log('📋 Summary:')
const totalIssues =
  missingInfo.length +
  missingCoords.length +
  adjacencyMissingInfo.length +
  invalidAdjacencyRefs.length +
  invalidScenarioProvinces.length

if (totalIssues === 0) {
  console.log('  🎉 All validation checks passed!')
} else {
  console.error(`  ❌ Found ${totalIssues} critical issues that need fixing`)
}

if (unidirectional.length > 0) {
  console.log(`  ⚠️  ${unidirectional.length} bidirectional adjacency warnings`)
}
