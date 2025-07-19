import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Trend } from '@/types';

interface TrendRadarProps {
  data: Trend[];
}

export function TrendRadar({ data }: TrendRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const width = 800;
    const height = 600;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%');

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 10])
      .range([height - margin.bottom, margin.top]);

    // Create bubble size scale
    const sizeScale = d3
      .scaleSqrt()
      .domain([0, d3.max(data, (d) => d.validationCount) || 100])
      .range([5, 50]);

    // Color scale for categories
    const colorScale = d3
      .scaleOrdinal()
      .domain(['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'])
      .range(['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444']);

    // Create bubbles
    const bubbles = svg
      .selectAll('g.bubble')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', (d) => `translate(${xScale(d.viralityScore * 100)}, ${yScale(d.qualityScore * 10)})`);

    // Add circles
    bubbles
      .append('circle')
      .attr('r', (d) => sizeScale(d.validationCount))
      .attr('fill', (d) => colorScale(d.category) as string)
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels
    bubbles
      .append('text')
      .text((d) => d.title.substring(0, 20) + '...')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none');

    // Add axes
    svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickFormat((d) => `${d}%`))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('fill', '#666')
      .text('Virality Potential');

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -20)
      .attr('x', -height / 2)
      .attr('fill', '#666')
      .text('Quality Score');

    // Add hover interactions
    bubbles
      .on('mouseover', function (event, d) {
        d3.select(this).select('circle').attr('opacity', 1);
        
        // Show tooltip
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.9)')
          .style('color', '#fff')
          .style('padding', '10px')
          .style('border-radius', '5px')
          .style('pointer-events', 'none')
          .style('opacity', 0);

        tooltip
          .html(
            `<strong>${d.title}</strong><br/>
             Category: ${d.category}<br/>
             Virality: ${(d.viralityScore * 100).toFixed(0)}%<br/>
             Validations: ${d.validationCount}<br/>
             First spotted: ${new Date(d.createdAt).toLocaleDateString()}`
          )
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .transition()
          .duration(200)
          .style('opacity', 1);
      })
      .on('mouseout', function () {
        d3.select(this).select('circle').attr('opacity', 0.7);
        d3.selectAll('.tooltip').remove();
      });

  }, [data]);

  return <svg ref={svgRef} className="w-full h-full" />;
}