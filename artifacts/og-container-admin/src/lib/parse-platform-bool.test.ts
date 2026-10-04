/**
 * Assertions for parsePlatformBool (dual-currency setting parser).
 * Run from frontend/: npx --yes tsx src/lib/parse-platform-bool.test.ts
 */
import assert from "node:assert/strict"
import { parsePlatformBool } from "./parse-platform-bool.ts"

assert.equal(parsePlatformBool(false), false)
assert.equal(parsePlatformBool(0), false)
assert.equal(parsePlatformBool("0"), false)
assert.equal(parsePlatformBool("false"), false)
assert.equal(parsePlatformBool("off"), false)
assert.equal(parsePlatformBool(true), true)
assert.equal(parsePlatformBool(1), true)
assert.equal(parsePlatformBool("1"), true)
assert.equal(parsePlatformBool("true"), true)
assert.equal(parsePlatformBool(undefined, true), true)
assert.equal(parsePlatformBool(null, true), true)
assert.equal(parsePlatformBool(undefined, false), false)

console.log("parse-platform-bool.test.ts: all assertions passed")
