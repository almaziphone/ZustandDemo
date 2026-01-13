import { Mesh, PlaneGeometry, Group, Vector3, MathUtils } from 'three'
import { useRef, useState, useLayoutEffect } from 'react'
import { createRoot, events, extend, useFrame } from '@react-three/fiber'
import { Plane, useAspect, useTexture } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import Fireflies from './Fireflies'
import bgUrl from '../resources/bg.jpg'
import starsUrl from '../resources/stars.png'
import groundUrl from '../resources/ground.png'
import bearUrl from '../resources/bear.png'
import leaves1Url from '../resources/leaves1.png'
import leaves2Url from '../resources/leaves2.png'
import '../materials/layerMaterial'

function Experience() {
  const scaleN = useAspect(1600, 1000, 1.15)
  const scaleW = useAspect(2200, 1000, 1.15)
  const scaleW2 = useAspect(2200, 1000, 1.3)
  const textures = useTexture([
    bgUrl,
    starsUrl,
    groundUrl,
    bearUrl,
    leaves1Url,
    leaves2Url,
  ])
  const group = useRef()
  const layersRef = useRef([])
  const [movement] = useState(() => new Vector3())
  const [temp] = useState(() => new Vector3())
  const [tempLeaves1] = useState(() => new Vector3())
  const [tempLeaves2] = useState(() => new Vector3())
  const deviceOrientation = useRef({ beta: 0, gamma: 0, available: false })
  const permissionRequested = useRef(false)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const swipeData = useRef({ 
    startX: 0, 
    startY: 0, 
    isSwiping: false,
    swipeOffset: 0,
    isHorizontalSwipe: false
  })
  const leaves1MovementOffset = useRef(new Vector3(0, 0, 0))
  const leaves2MovementOffset = useRef(new Vector3(0, 0, 0))
  const leaves1Time = useRef(0)
  const leaves2Time = useRef(0)
  const layers = [
    { texture: textures[0], x: 0, y: 0, z: 0, factor: 0.005, scale: scaleW },
    { texture: textures[1], x: 0, y: 0, z: 10, factor: 0.005, scale: scaleW },
    { texture: textures[2], x: 0, y: 0, z: 20, scale: scaleW },
    {
      texture: textures[3],
      x: isMobile ? 38 : 0, // Смещение вправо для мобильных устройств
      y: 0,
      z: 30,
      scaleFactor:  isMobile ? 0.60 : 0.73,
      scale: scaleN,
    },
    {
      texture: textures[4],
      x: 0,
      y: 0,
      z: 40,
      factor: 0.025,
      scaleFactor: 1,
      wiggle: 0.6,
      scale: scaleW,
    },
    {
      texture: textures[5],
      x: 0,
      y: 0,
      z: 49,
      factor: 0.015,
      scaleFactor: 1.0,
      wiggle: 0.6,
      scale: scaleW2,
    },
  ]

  const rotationMultiplier = isMobile ? 0.8 : 1
  const fireflyCount = isMobile ? 10 : 20
  const fireflyRadius = isMobile ? 60 : 80

  // Обработка ориентации устройства для мобильных
  useLayoutEffect(() => {
    if (!isMobile || typeof window === 'undefined') return

    const handleOrientation = (event) => {
      if (event.gamma !== null && !isNaN(event.gamma)) {
        deviceOrientation.current.gamma = event.gamma
        deviceOrientation.current.beta = event.beta !== null && !isNaN(event.beta) ? event.beta : 0
        deviceOrientation.current.available = true
      }
    }

    const handleMotion = (event) => {
      if (event.rotationRate) {
        const gammaRate = event.rotationRate.gamma || 0
        const betaRate = event.rotationRate.beta || 0
        if (!isNaN(gammaRate) && !isNaN(betaRate)) {
          deviceOrientation.current.gamma = (deviceOrientation.current.gamma * 0.9) + (gammaRate * 0.1 * 10)
          deviceOrientation.current.beta = (deviceOrientation.current.beta * 0.9) + (betaRate * 0.1 * 10)
          deviceOrientation.current.available = true
        }
      }
    }

    const requestPermission = () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (permissionRequested.current) return
        permissionRequested.current = true

        Promise.all([
          DeviceOrientationEvent.requestPermission(),
          typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'
            ? DeviceMotionEvent.requestPermission()
            : Promise.resolve('granted')
        ]).then(([orientationResponse, motionResponse]) => {
          if (orientationResponse === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, { passive: true })
          }
          if (motionResponse === 'granted') {
            window.addEventListener('devicemotion', handleMotion, { passive: true })
          }
          if (orientationResponse !== 'granted' && motionResponse !== 'granted') {
            permissionRequested.current = false
          }
        }).catch(() => {
          permissionRequested.current = false
        })
      } else {
        try {
          window.addEventListener('deviceorientation', handleOrientation, { passive: true })
          window.addEventListener('devicemotion', handleMotion, { passive: true })
        } catch (e) {
          console.warn('Не удалось добавить обработчики ориентации:', e)
        }
      }
    }

    const handleFirstTouch = () => {
      requestPermission()
    }

    if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') {
      requestPermission()
    }

    document.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true, capture: true })
    document.addEventListener('click', handleFirstTouch, { once: true, passive: true, capture: true })
    
    const canvasElement = document.querySelector('canvas')
    if (canvasElement) {
      canvasElement.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true })
      canvasElement.addEventListener('click', handleFirstTouch, { once: true, passive: true })
    }

    const handleTouchStart = (e) => {
      if (!swipeData.current || !e.touches || e.touches.length === 0) return
      swipeData.current.startX = e.touches[0].clientX
      swipeData.current.startY = e.touches[0].clientY
      swipeData.current.isSwiping = true
      swipeData.current.isHorizontalSwipe = false
    }

    const handleTouchMove = (e) => {
      if (!swipeData.current || !swipeData.current.isSwiping || !e.touches || e.touches.length === 0) return
      if (!window.innerWidth) return
      
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const deltaX = currentX - swipeData.current.startX
      const deltaY = currentY - swipeData.current.startY
      
      if (!swipeData.current.isHorizontalSwipe && (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15)) {
        swipeData.current.isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
      }
      
      if (swipeData.current.isHorizontalSwipe && Math.abs(deltaX) > 10) {
        e.preventDefault()
        const maxDelta = window.innerWidth * 0.5
        const clampedDeltaX = Math.max(-maxDelta, Math.min(maxDelta, deltaX))
        const normalizedDelta = clampedDeltaX / window.innerWidth
        swipeData.current.swipeOffset = Math.max(-0.6, Math.min(0.6, normalizedDelta * 2.5))
      }
    }

    const handleTouchEnd = () => {
      if (swipeData.current) {
        swipeData.current.isSwiping = false
        swipeData.current.isHorizontalSwipe = false
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('devicemotion', handleMotion)
      document.removeEventListener('touchstart', handleFirstTouch, { capture: true })
      document.removeEventListener('click', handleFirstTouch, { capture: true })
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
      const canvasElement = document.querySelector('canvas')
      if (canvasElement) {
        canvasElement.removeEventListener('touchstart', handleFirstTouch)
        canvasElement.removeEventListener('click', handleFirstTouch)
      }
    }
  }, [isMobile])

  useFrame((state, delta) => {
    if (!group.current) return
    
    let targetX = state.pointer.x
    let targetY = state.pointer.y

    if (isMobile && swipeData.current) {
      let orientationX = 0
      let orientationY = 0
      
      if (deviceOrientation.current?.available) {
        const gamma = deviceOrientation.current.gamma
        const beta = deviceOrientation.current.beta
        const normalizedGamma = Math.max(-60, Math.min(60, gamma)) / 60
        const normalizedBeta = Math.max(-45, Math.min(45, beta)) / 45
        orientationX = normalizedGamma
        orientationY = normalizedBeta * 0.5
      }
      
      if (!swipeData.current.isSwiping) {
        swipeData.current.swipeOffset = MathUtils.lerp(swipeData.current.swipeOffset, 0, 0.05)
      }
      
      const limitedSwipe = Math.max(-0.6, Math.min(0.6, swipeData.current.swipeOffset))
      if (swipeData.current.isSwiping && swipeData.current.isHorizontalSwipe && Math.abs(swipeData.current.swipeOffset) > 0.01) {
        targetX = limitedSwipe + orientationX * 0.3
      } else {
        targetX = orientationX + limitedSwipe * 0.6
      }
      
      targetY = orientationY
    }

    const clampedTargetX = Math.max(-0.6, Math.min(0.6, targetX))
    movement.lerp(temp.set(clampedTargetX, targetY, 0), 0.2)
    
    const maxOffset = isMobile ? 15 : 18
    const mobileOffset = isMobile ? -1.5 : 0
    
    group.current.position.x = MathUtils.lerp(
      group.current.position.x,
      clampedTargetX * maxOffset + mobileOffset,
      0.05,
    )
    group.current.rotation.x = MathUtils.lerp(
      group.current.rotation.x,
      targetY / (20 * rotationMultiplier),
      0.05,
    )
    const maxRotationY = (-targetX / (2 * rotationMultiplier)) * 0.2
    group.current.rotation.y = MathUtils.lerp(
      group.current.rotation.y,
      maxRotationY,
      0.05,
    )
    
    if (layersRef.current[4]) {
      leaves1Time.current += delta * 1.2
      layersRef.current[4].uniforms.time.value = leaves1Time.current
      leaves1MovementOffset.current.lerp(
        tempLeaves1.set(targetX * 0.8, targetY * 0.7, 0),
        0.15
      )
      layersRef.current[4].uniforms.movementOffset.value = [
        leaves1MovementOffset.current.x,
        leaves1MovementOffset.current.y,
        0
      ]
    }
    
    if (layersRef.current[5]) {
      leaves2Time.current += delta * 0.8
      layersRef.current[5].uniforms.time.value = leaves2Time.current
      leaves2MovementOffset.current.lerp(
        tempLeaves2.set(-targetX * 0.6, -targetY * 0.5, 0),
        0.12
      )
      layersRef.current[5].uniforms.movementOffset.value = [
        leaves2MovementOffset.current.x,
        leaves2MovementOffset.current.y,
        0
      ]
    }
  }, 1)

  return (
    <group ref={group}>
      <Fireflies count={fireflyCount} radius={fireflyRadius} colors={['orange']} />
      {layers.map(
        (
          {
            scale,
            texture,
            factor = 0,
            scaleFactor = 1,
            wiggle = 0,
            x,
            y,
            z,
          },
          i,
        ) => (
          <Plane
            scale={scale}
            args={[1, 1, wiggle ? 10 : 1, wiggle ? 10 : 1]}
            position={[x, y, z]}
            key={i}
          >
            <layerMaterial
              movement={movement}
              textr={texture}
              factor={factor}
              ref={(el) => (layersRef.current[i] = el)}
              wiggle={wiggle}
              scale={scaleFactor}
              movementOffset={[0, 0, 0]}
            />
          </Plane>
        ),
      )}
    </group>
  )
}

function Effects() {
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Vignette />
    </EffectComposer>
  )
}

function FallbackScene() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#010101',
      }}
    >
      <img
        src="/ogimage.jpg"
        alt="Zustand Bear"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}

export default function Scene() {
  const [error, setError] = useState(null)

  if (error) {
    return <FallbackScene />
  }

  return (
    <Canvas onError={setError}>
      <Experience />
      <Effects />
    </Canvas>
  )
}

function Canvas({ children, onError }) {
  extend({ Mesh, PlaneGeometry, Group })
  const canvas = useRef(null)
  const root = useRef(null)
  useLayoutEffect(() => {
    try {
      if (!root.current) {
        root.current = createRoot(canvas.current).configure({
          events,
          orthographic: true,
          gl: { antialias: false },
          camera: { zoom: 5, position: [0, 0, 200], far: 300, near: 50 },
          onCreated: (state) => {
            state.events.connect(document.getElementById('root'))
            state.setEvents({
              compute: (event, state) => {
                const clientX = event.touches ? event.touches[0].clientX : event.clientX
                const clientY = event.touches ? event.touches[0].clientY : event.clientY
                state.pointer.set(
                  (clientX / state.size.width) * 2 - 1,
                  -(clientY / state.size.height) * 2 + 1,
                )
                state.raycaster.setFromCamera(state.pointer, state.camera)
              },
            })
          },
        })
      }
      const resize = () =>
        root.current.configure({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      window.addEventListener('resize', resize)
      root.current.render(children)
      return () => window.removeEventListener('resize', resize)
    } catch (e) {
      onError?.(e)
    }
  }, [children, onError])

  return (
    <canvas
      ref={canvas}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'block',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    />
  )
}
