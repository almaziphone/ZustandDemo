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
  // Обработка свайпов для мобильных
  const swipeData = useRef({ 
    startX: 0, 
    startY: 0, 
    currentX: 0, 
    isSwiping: false,
    swipeOffset: 0, // Накопленное смещение от свайпов
    isHorizontalSwipe: false // Флаг для определения горизонтального свайпа
  })
  // Разные параметры движения для каждого слоя листьев для эффекта 3D
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
      x: isMobile ? 6 : 0, // Смещение вправо для мобильных устройств
      y: 0,
      z: 30,
      scaleFactor: isMobile ? 0.65 : 0.83, // Уменьшен для мобильных устройств
      scale: scaleN,
    },
    {
      texture: textures[4],
      x: 0,
      y: 0,
      z: 40,
      factor: 0.025, // Немного уменьшен для предотвращения выхода за границы
      scaleFactor: 1,
      wiggle: 0.6,
      scale: scaleW,
      layerIndex: 4, // Индекс для идентификации слоя листьев
    },
    {
      texture: textures[5],
      x: 0,
      y: 0,
      z: 49,
      factor: 0.015, // Немного уменьшен для предотвращения выхода за границы
      scaleFactor: 1.0,
      wiggle: 0.6,
      scale: scaleW2,
      layerIndex: 5, // Индекс для идентификации слоя листьев
    },
  ]

  const movementMultiplier = isMobile ? 18 : 20
  const rotationMultiplier = isMobile ? 0.8 : 1
  const fireflyCount = isMobile ? 10 : 20
  const fireflyRadius = isMobile ? 60 : 80

  // Обработка ориентации устройства для мобильных
  useLayoutEffect(() => {
    if (!isMobile || typeof window === 'undefined') return

    const handleOrientation = (event) => {
      // beta - наклон вперед-назад (от -180 до 180, где 0 - горизонтально)
      // gamma - наклон влево-вправо (от -90 до 90, где 0 - вертикально)
      // Для движения слева направо используем gamma!
      if (event.gamma !== null && !isNaN(event.gamma)) {
        deviceOrientation.current.gamma = event.gamma
        deviceOrientation.current.beta = event.beta !== null && !isNaN(event.beta) ? event.beta : 0
        deviceOrientation.current.available = true
      }
    }

    // Альтернативный обработчик через devicemotion (иногда работает лучше на iOS)
    const handleMotion = (event) => {
      if (event.rotationRate) {
        // rotationRate - это скорость вращения, накапливаем её для получения угла
        const gammaRate = event.rotationRate.gamma || 0
        const betaRate = event.rotationRate.beta || 0
        if (!isNaN(gammaRate) && !isNaN(betaRate)) {
          // Интегрируем скорость для получения угла (упрощенно)
          deviceOrientation.current.gamma = (deviceOrientation.current.gamma * 0.9) + (gammaRate * 0.1 * 10)
          deviceOrientation.current.beta = (deviceOrientation.current.beta * 0.9) + (betaRate * 0.1 * 10)
          deviceOrientation.current.available = true
        }
      }
    }

    // Функция для запроса разрешения
    const requestPermission = () => {
      // Для iOS 13+ требуется явное разрешение по действию пользователя
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // Проверяем, не запрашивали ли уже
        if (permissionRequested.current) return
        permissionRequested.current = true

        // Запрашиваем разрешение для обоих событий
        Promise.all([
          DeviceOrientationEvent.requestPermission(),
          typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'
            ? DeviceMotionEvent.requestPermission()
            : Promise.resolve('granted')
        ]).then(([orientationResponse, motionResponse]) => {
          if (orientationResponse === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, { passive: true })
            console.log('Разрешение на deviceorientation получено')
          }
          if (motionResponse === 'granted') {
            window.addEventListener('devicemotion', handleMotion, { passive: true })
            console.log('Разрешение на devicemotion получено')
          }
          if (orientationResponse !== 'granted' && motionResponse !== 'granted') {
            console.log('Разрешения на ориентацию отклонены')
            permissionRequested.current = false
          }
        })
          .catch((error) => {
            console.warn('Ошибка запроса разрешения на ориентацию:', error)
            permissionRequested.current = false
          })
      } else {
        // Для Android и старых iOS - сразу добавляем обработчики
        try {
          window.addEventListener('deviceorientation', handleOrientation, { passive: true })
          window.addEventListener('devicemotion', handleMotion, { passive: true })
        } catch (e) {
          console.warn('Не удалось добавить обработчики ориентации:', e)
        }
      }
    }

    // Запрашиваем разрешение при первом касании (для iOS)
    const handleFirstTouch = (e) => {
      // Для iOS запрос должен быть по действию пользователя
      requestPermission()
    }

    // Для Android и старых iOS - сразу запрашиваем
    if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') {
      requestPermission()
    }

    // Для iOS 13+ - запрашиваем при первом касании/клике
    // Используем capture phase для более раннего перехвата
    document.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true, capture: true })
    document.addEventListener('click', handleFirstTouch, { once: true, passive: true, capture: true })
    
    // Также пробуем при любом взаимодействии с canvas
    const canvasElement = document.querySelector('canvas')
    if (canvasElement) {
      canvasElement.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true })
      canvasElement.addEventListener('click', handleFirstTouch, { once: true, passive: true })
    }

    // Обработка свайпов влево-вправо
    const handleTouchStart = (e) => {
      try {
        if (!swipeData.current || !e.touches || e.touches.length === 0) return
        swipeData.current.startX = e.touches[0].clientX
        swipeData.current.startY = e.touches[0].clientY
        swipeData.current.isSwiping = true
        swipeData.current.isHorizontalSwipe = false
      } catch (err) {
        console.warn('Ошибка в handleTouchStart:', err)
      }
    }

    const handleTouchMove = (e) => {
      try {
        if (!swipeData.current || !swipeData.current.isSwiping || !e.touches || e.touches.length === 0) return
        if (typeof window === 'undefined' || !window.innerWidth) return
        
        const currentX = e.touches[0].clientX
        const currentY = e.touches[0].clientY
        const deltaX = currentX - swipeData.current.startX
        const deltaY = currentY - swipeData.current.startY
        
        // Определяем направление свайпа только один раз при начале движения
        if (!swipeData.current.isHorizontalSwipe && (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15)) {
          swipeData.current.isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
        }
        
        // Обрабатываем только горизонтальные свайпы
        if (swipeData.current.isHorizontalSwipe && Math.abs(deltaX) > 10) {
          // Предотвращаем навигацию браузера при горизонтальном свайпе
          e.preventDefault()
          
          // Ограничиваем максимальное смещение для более контролируемого движения
          const maxDelta = window.innerWidth * 0.5 // Максимум 50% ширины экрана
          const clampedDeltaX = Math.max(-maxDelta, Math.min(maxDelta, deltaX))
          
          // Нормализуем смещение относительно ширины экрана
          const normalizedDelta = clampedDeltaX / window.innerWidth
          // Обновляем накопленное смещение
          swipeData.current.swipeOffset = Math.max(-0.6, Math.min(0.6, normalizedDelta * 2.5))
          swipeData.current.currentX = currentX
        }
      } catch (err) {
        console.warn('Ошибка в handleTouchMove:', err)
      }
    }

    const handleTouchEnd = () => {
      try {
        if (swipeData.current) {
          swipeData.current.isSwiping = false
          swipeData.current.isHorizontalSwipe = false
        }
        // Плавно возвращаем смещение к нулю после окончания свайпа
        // Это будет обработано в useFrame через lerp
      } catch (err) {
        console.warn('Ошибка в handleTouchEnd:', err)
      }
    }

    // Добавляем обработчики свайпов на document
    // Для touchmove используем passive: false, чтобы можно было предотвратить навигацию браузера
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
    
    // Используем ориентацию устройства на мобильных, иначе указатель мыши/касания
    let targetX = state.pointer.x
    let targetY = state.pointer.y

    if (isMobile && swipeData.current) {
      let orientationX = 0
      let orientationY = 0
      
      // Получаем данные ориентации устройства
      if (deviceOrientation.current && deviceOrientation.current.available) {
        // gamma - наклон влево-вправо (от -90 до 90, где 0 - вертикально)
        // beta - наклон вперед-назад (от -180 до 180, где 0 - горизонтально)
        const gamma = deviceOrientation.current.gamma
        const beta = deviceOrientation.current.beta
        
        // Нормализуем gamma для горизонтального движения (влево-вправо)
        // Увеличиваем диапазон для более заметного параллакса
        const normalizedGamma = Math.max(-60, Math.min(60, gamma)) / 60
        // Нормализуем beta для вертикального движения
        const normalizedBeta = Math.max(-45, Math.min(45, beta)) / 45
        
        orientationX = normalizedGamma
        orientationY = normalizedBeta * 0.5 // Увеличиваем вертикальное движение
      }
      
      // Комбинируем данные ориентации и свайпов
      // Плавно затухаем смещение от свайпа, если свайп не активен (медленнее для более плавного эффекта)
      if (!swipeData.current.isSwiping) {
        swipeData.current.swipeOffset = MathUtils.lerp(swipeData.current.swipeOffset, 0, 0.05)
      }
      
      // Комбинируем ориентацию и свайп (приоритет свайпу во время активного горизонтального свайпа)
      if (swipeData.current.isSwiping && swipeData.current.isHorizontalSwipe && Math.abs(swipeData.current.swipeOffset) > 0.01) {
        // Во время активного горизонтального свайпа используем в основном свайп, но немного учитываем ориентацию
        // Ограничиваем максимальное значение для более контролируемого движения
        const limitedSwipe = Math.max(-0.6, Math.min(0.6, swipeData.current.swipeOffset))
        targetX = limitedSwipe + orientationX * 0.3
      } else {
        // Когда свайп не активен или это не горизонтальный свайп, используем ориентацию + остаточное смещение от свайпа
        const limitedSwipe = Math.max(-0.6, Math.min(0.6, swipeData.current.swipeOffset))
        targetX = orientationX + limitedSwipe * 0.6
      }
      
      targetY = orientationY
    }

    // Ограничиваем targetX для предотвращения черных областей
    const clampedTargetX = Math.max(-0.6, Math.min(0.6, targetX))
    
    movement.lerp(temp.set(clampedTargetX, targetY, 0), 0.2)
    
    // Максимальное смещение - фоновые слои теперь достаточно большие
    const maxOffset = isMobile ? 15 : 18
    // Постоянное смещение влево для мобильных устройств (уменьшено для лучшей видимости медведя)
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
    // Ограничиваем поворот по горизонтали до 20%
    const maxRotationY = (-targetX / (2 * rotationMultiplier)) * 0.2
    group.current.rotation.y = MathUtils.lerp(
      group.current.rotation.y,
      maxRotationY,
      0.05,
    )
    
    // Разное движение для каждого слоя листьев для эффекта 3D
    // Первый слой листьев (индекс 4) - двигается быстрее и в одном направлении
    if (layersRef.current[4]) {
      leaves1Time.current += delta * 1.2 // Быстрее
      layersRef.current[4].uniforms.time.value = leaves1Time.current
      // Движение с небольшим смещением для параллакса
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
    
    // Второй слой листьев (индекс 5) - двигается медленнее и в противоположном направлении
    if (layersRef.current[5]) {
      leaves2Time.current += delta * 0.8 // Медленнее
      layersRef.current[5].uniforms.time.value = leaves2Time.current
      // Движение с противоположным смещением для глубины
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
            ref,
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
            ref={ref}
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
                // Поддержка как мыши, так и касаний
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
