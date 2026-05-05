import { useEffect, useState, useRef } from 'react'

export function useCountUp(target: number, duration = 1500, startOnView = true) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(!startOnView)
  const ref = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!startOnView) {
      animate()
      return
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true)
          observerRef.current?.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observerRef.current.observe(ref.current)
    return () => observerRef.current?.disconnect()
  }, [])

  useEffect(() => {
    if (hasStarted) animate()
  }, [hasStarted])

  function animate() {
    const startTime = performance.now()

    function step(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }

  return { count, ref }
}
