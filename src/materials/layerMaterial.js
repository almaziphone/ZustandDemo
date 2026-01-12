import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// This material takes care of wiggling and punches a hole into
// alpha regions so that the depth-of-field effect can process the layers.
// Credit: Gianmarco Simone https://twitter.com/ggsimm

const LayerMaterial = shaderMaterial(
  { textr: null, movement: [0, 0, 0], scale: 1, factor: 0, wiggle: 0, time: 0, movementOffset: [0, 0, 0] },
  ` uniform float time;
    uniform vec2 resolution;
    uniform float wiggle;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main()	{
      vUv = uv;
      vec3 transformed = vec3(position);
      if (wiggle > 0.) {
        float theta = sin(time + position.y) / 2.0 * wiggle;
        float c = cos(theta);
        float s = sin(theta);
        mat3 m = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
        transformed = transformed * m;
        vNormal = vNormal * m;
      }
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.);
    }`,
  ` uniform float time;
    uniform vec2 resolution;
    uniform float factor;
    uniform float scale;
    uniform vec3 movement;
    uniform vec3 movementOffset;
    uniform sampler2D textr;
    varying vec2 vUv;
    void main()	{
      // Комбинируем движение с дополнительным смещением для разных слоев
      vec2 movementCombined = (movement.xy + movementOffset.xy) * factor;
      // Масштабируем UV координаты
      vec2 baseUv = vUv / scale;
      // Ограничиваем смещение, чтобы текстура не выходила за границы
      // Это предотвращает пустые области по краям
      vec2 maxOffset = vec2(0.2, 0.2); // Максимальное смещение
      vec2 clampedMovement = clamp(movementCombined, -maxOffset, maxOffset);
      vec2 uv = clamp(baseUv + clampedMovement, 0.0, 1.0);
      
      vec4 color = texture2D(textr, uv);
      if (color.a < 0.1) discard;
      gl_FragColor = vec4(color.rgb, .1);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
)

extend({ LayerMaterial })
