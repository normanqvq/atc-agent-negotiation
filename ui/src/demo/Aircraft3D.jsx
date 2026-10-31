import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// palette from style.css, as three.js colours
const WHITE = 0xF4F6F8
const GREY = 0xC9D0D8
const INK = 0x0D1117
const YELLOW = 0xFFC72C
const ASPHALT = 0x59616C

// the holding pattern: an oval over the runway, one lap every 18 s
const LAP_S = 18
const OVAL_X = 3.4
const OVAL_Z = 1.7
const HOLD_Y = 2.4

// a flat shape (drawn as x/y points) pushed out into a thin slab
function slab(points, thickness) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  geo.translate(0, 0, -thickness / 2) // centre the slab on its own plane
  return geo
}

// low-poly airliner built from primitives. nose points +z (so lookAt() aims it), up is +y
function buildAircraft() {
  const plane = new THREE.Group()
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, flatShading: true })
  const body = mat(WHITE)
  const wingMat = mat(GREY)
  const dark = mat(INK)
  const accent = mat(YELLOW)

  function add(geo, material) {
    const mesh = new THREE.Mesh(geo, material)
    mesh.castShadow = true
    plane.add(mesh)
    return mesh
  }

  // fuselage: a tube along z
  add(new THREE.CylinderGeometry(0.34, 0.34, 4.2, 18).rotateX(Math.PI / 2), body)

  // nose: half a stretched ball on the front, with a dark windscreen band on top
  add(new THREE.SphereGeometry(0.34, 18, 12).scale(1, 1, 2), body).position.z = 2.1
  const screen = new THREE.SphereGeometry(0.345, 18, 6, Math.PI / 2 - 0.7, 1.4, 0.75, 0.32).scale(1, 1, 2)
  add(screen, dark).position.z = 2.1

  // tail cone, tipped up a little like a real one
  const tail = add(new THREE.ConeGeometry(0.34, 1.6, 18).rotateX(-Math.PI / 2), body)
  tail.position.set(0, 0.06, -2.9)
  tail.rotation.x = -0.08

  // swept main wing, one slab (shape y = forward). rotateX turns it flat
  const wing = slab([[0, 0.9], [3.3, -0.7], [3.3, -1.1], [0.4, -0.55], [-0.4, -0.55], [-3.3, -1.1], [-3.3, -0.7]], 0.09)
  add(wing.rotateX(Math.PI / 2), wingMat).position.set(0, -0.12, 0.1)

  // tailplane, same idea, smaller
  const stab = slab([[0, 0.4], [1.3, -0.3], [1.3, -0.55], [0, -0.3], [-1.3, -0.55], [-1.3, -0.3]], 0.06)
  add(stab.rotateX(Math.PI / 2), wingMat).position.set(0, 0.1, -2.75)

  // fin in the sign yellow (shape x = along the body, y = up). rotateY stands it upright
  const fin = slab([[0.2, 0], [-0.75, 1.35], [-1.15, 1.35], [-0.95, 0]], 0.07)
  add(fin.rotateY(-Math.PI / 2), accent).position.set(0, 0.25, -2.4)

  // two engines under the wings, dark intake at the front
  for (const side of [-1, 1]) {
    const engine = add(new THREE.CylinderGeometry(0.2, 0.16, 0.85, 16).rotateX(Math.PI / 2), wingMat)
    engine.position.set(side * 1.25, -0.38, 0.75)
    const intake = add(new THREE.CircleGeometry(0.17, 16), dark)
    intake.position.set(side * 1.25, -0.38, 1.18)
    const pylon = add(new THREE.BoxGeometry(0.06, 0.22, 0.5), wingMat)
    pylon.position.set(side * 1.25, -0.2, 0.55)
  }

  plane.scale.setScalar(0.5)
  return plane
}

// runway along x with centre line dashes and threshold bars, plus a taxiway
// that joins it with the yellow hold-short line (the line nobody crosses without clearance)
function buildGround() {
  const ground = new THREE.Group()
  const flat = (w, d, color, x, z, y) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }))
    mesh.position.set(x, y, z)
    mesh.receiveShadow = true
    ground.add(mesh)
  }

  flat(11, 1.5, ASPHALT, 0, 0, 0) // runway
  flat(0.9, 2.6, ASPHALT, 1.8, 2.05, -0.001) // taxiway coming in from the front

  // centre line dashes
  for (let x = -4.0; x <= 4.0; x += 0.8) flat(0.4, 0.05, WHITE, x, 0, 0.002)
  // threshold bars at both ends
  for (const end of [-5.1, 5.1]) {
    for (let z = -0.55; z <= 0.56; z += 0.22) flat(0.5, 0.1, WHITE, end, z, 0.002)
  }

  // taxiway centre line + hold-short: two solid lines, two dashed lines
  flat(0.04, 2.0, YELLOW, 1.8, 2.3, 0.002)
  flat(0.9, 0.04, YELLOW, 1.8, 1.05, 0.003)
  flat(0.9, 0.04, YELLOW, 1.8, 1.13, 0.003)
  for (let x = 1.39; x < 2.25; x += 0.16) {
    flat(0.09, 0.04, YELLOW, x, 1.23, 0.003)
    flat(0.09, 0.04, YELLOW, x, 1.31, 0.003)
  }

  // invisible floor that only shows the aircraft's shadow
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.12 }))
  floor.position.y = -0.002
  floor.receiveShadow = true
  ground.add(floor)
  return ground
}

// where the aircraft is on the oval at time t (seconds), and how far it banks
function holdingPose(t) {
  const a = (t / LAP_S) * Math.PI * 2
  const pos = new THREE.Vector3(OVAL_X * Math.cos(a), HOLD_Y + 0.12 * Math.sin(a * 2), OVAL_Z * Math.sin(a))
  // bank harder at the tight ends of the oval, almost level on the long sides
  const s = Math.sin(a)
  const c = Math.cos(a)
  const turn = (OVAL_X * OVAL_Z) / (OVAL_X * OVAL_X * s * s + OVAL_Z * OVAL_Z * c * c)
  const bank = 0.5 * turn * (OVAL_Z / OVAL_X)
  return { pos, bank }
}

// a white airliner flying a slow holding pattern over the runway.
// one canvas, one renderer, cleaned up on unmount. reduced motion = one still frame.
export default function Aircraft3D() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    // the stage is css-scaled to the window, so render at the size it ends up on screen
    const zoom = canvas.getBoundingClientRect().width / width
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * zoom, 2))
    renderer.setSize(width, height, false)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100)
    camera.position.set(-4, 11, 13.5)
    camera.lookAt(-0.4, 0.9, 0.2)

    // soft light: sky from above, sun from the upper left casting the shadow
    scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xB8C2CE, 2.2))
    const sun = new THREE.DirectionalLight(0xFFFFFF, 2.0)
    sun.position.set(-4, 12, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -9
    sun.shadow.camera.right = 9
    sun.shadow.camera.top = 9
    sun.shadow.camera.bottom = -9
    sun.shadow.radius = 4
    scene.add(sun)

    scene.add(buildGround())
    const plane = buildAircraft()
    scene.add(plane)

    function place(t) {
      const now = holdingPose(t)
      const ahead = holdingPose(t + 0.05)
      plane.position.copy(now.pos)
      plane.lookAt(ahead.pos) // nose along the path
      plane.rotateZ(now.bank) // then lean into the turn
    }

    let frame = 0
    const start = performance.now()
    const START_T = 2 // start on the long side so the first frame shows the aircraft side-on

    function tick() {
      place(START_T + (performance.now() - start) / 1000)
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      place(START_T)
      renderer.render(scene, camera)
    } else {
      tick()
    }

    return () => {
      cancelAnimationFrame(frame)
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      })
      // no forceContextLoss(): react strict mode mounts twice on the same canvas in dev
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="aircraft3d" aria-label="3D aircraft holding over the runway" />
}
