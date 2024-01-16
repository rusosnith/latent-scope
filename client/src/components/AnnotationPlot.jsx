import React, { useEffect, useRef } from 'react';
import { scaleLinear } from 'd3-scale';

import "./AnnotationPlot.css"

const AnnotationPlot = ({ 
  points, 
  fill,
  stroke,
  size,
  symbol,
  xDomain, 
  yDomain, 
  width, 
  height
}) => {
  const container = useRef();
  
  useEffect(() => {
    if(xDomain && yDomain) {
      const xScale = scaleLinear()
        .domain(xDomain)
        .range([0, width])
      const yScale = scaleLinear()
        .domain(yDomain)
        .range([height, 0])

      const zScale = (t) => t/(.1 + xDomain[1] - xDomain[0])
      const canvas = container.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = fill 
      ctx.strokeStyle = stroke
      ctx.font = `${zScale(size)}px monospace`
      ctx.globalAlpha = 0.75
      let rw = zScale(size)
      points.map(point => {
        if(fill)
          ctx.fillRect(xScale(point[0]) - rw/2, yScale(point[1]) - rw/2, rw, rw)
        if(stroke)
          ctx.strokeRect(xScale(point[0]) - rw/2, yScale(point[1]) - rw/2, rw, rw)
        if(symbol)
          ctx.fillText(symbol, xScale(point[0]) - rw/3.2, yScale(point[1]) + rw/3.2)
      })
    }

  }, [points, fill, stroke, size, xDomain, yDomain, width, height])

  return <canvas 
    className="annotation-plot"
    ref={container} 
    width={width} 
    height={height} />;
};

export default AnnotationPlot;
