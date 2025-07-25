import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TrendTimelineData {
  id: string;
  title: string;
  category: string;
  data: Array<{
    date: Date;
    virality: number; // 0-100
  }>;
}

interface TrendTimelineProps {
  trends: TrendTimelineData[];
  dateRange: { start: Date; end: Date };
}

export function TrendTimeline({ trends, dateRange }: TrendTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !trends.length) return;

    const width = 1200;
    const height = 400;
    const margin = { top: 40, right: 250, bottom: 60, left: 60 };

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%');

    // Add background
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#0f172a')
      .attr('opacity', 0.5);
      
    // Add active trend indicator text
    const activeTrendText = svg
      .append('text')
      .attr('id', 'active-trend-text')
      .attr('x', width / 2)
      .attr('y', 25)
      .style('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', '#e2e8f0')
      .style('opacity', 0);

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain([dateRange.start, dateRange.end])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    // Color scale for categories
    const colorScale = d3
      .scaleOrdinal()
      .domain(['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'])
      .range(['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444']);

    // Create area generator for the wave effect
    const area = d3
      .area<{ date: Date; virality: number }>()
      .x(d => xScale(d.date))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.virality))
      .curve(d3.curveBasis); // Smooth curves for wave effect

    // Create line generator
    const line = d3
      .line<{ date: Date; virality: number }>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.virality))
      .curve(d3.curveBasis);

    // Add grid lines
    const xGrid = svg
      .append('g')
      .attr('class', 'grid x-grid')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(
        (d3.axisBottom(xScale)
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat(() => '')
          .ticks(d3.timeDay.every(1)) as any)
      );

    xGrid.selectAll('line')
      .style('stroke', '#1e293b')
      .style('stroke-dasharray', '2,2')
      .style('opacity', 0.5);
    xGrid.select('.domain').remove();

    const yGrid = svg
      .append('g')
      .attr('class', 'grid y-grid')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(
        (d3.axisLeft(yScale)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat(() => '')
          .ticks(5) as any)
      );

    yGrid.selectAll('line')
      .style('stroke', '#1e293b')
      .style('stroke-dasharray', '2,2')
      .style('opacity', 0.5);
    yGrid.select('.domain').remove();

    // Add wave visualization for each trend
    const trendGroups = svg
      .selectAll('.trend-wave')
      .data(trends)
      .enter()
      .append('g')
      .attr('class', 'trend-wave');

    // Add area fill (the wave) with animation
    trendGroups
      .append('path')
      .attr('class', 'trend-area')
      .attr('d', d => area(d.data))
      .attr('fill', d => colorScale(d.category) as string)
      .attr('opacity', 0)
      .style('filter', 'blur(1px)')
      .transition()
      .duration(1500)
      .delay((d, i) => i * 100)
      .attr('opacity', 0.2);

    // Add line with draw animation
    const lines = trendGroups
      .append('path')
      .attr('class', 'trend-line')
      .attr('d', d => line(d.data))
      .attr('fill', 'none')
      .attr('stroke', d => colorScale(d.category) as string)
      .attr('stroke-width', 2.5)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer');

    // Animate line drawing
    lines.each(function() {
      const path = d3.select(this);
      const totalLength = path.node()!.getTotalLength();
      
      path
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .delay((d, i) => i * 100)
        .attr('stroke-dashoffset', 0);
    });

    // Add glow effect to lines with fade in
    trendGroups
      .append('path')
      .attr('class', 'trend-line-glow')
      .attr('d', d => line(d.data))
      .attr('fill', 'none')
      .attr('stroke', d => colorScale(d.category) as string)
      .attr('stroke-width', 4)
      .attr('opacity', 0)
      .style('filter', 'blur(4px)')
      .transition()
      .duration(1500)
      .delay((d, i) => i * 100 + 500)
      .attr('opacity', 0.3);

    // Add hover interactions to lines
    trendGroups
      .on('mouseover', function(event, d) {
        // Dim all other trends
        svg.selectAll('.trend-wave').style('opacity', 0.3);
        d3.select(this).style('opacity', 1);
        
        // Highlight the line
        d3.select(this).select('.trend-line')
          .transition()
          .duration(200)
          .attr('stroke-width', 4)
          .attr('opacity', 1);
          
        // Highlight the glow
        d3.select(this).select('.trend-line-glow')
          .transition()
          .duration(200)
          .attr('stroke-width', 6)
          .attr('opacity', 0.5);
          
        // Highlight the area
        d3.select(this).select('.trend-area')
          .transition()
          .duration(200)
          .attr('opacity', 0.4);
          
        // Highlight in legend
        legend.selectAll('.legend-row').style('opacity', 0.3);
        legend.select(`#legend-${d.id}`).style('opacity', 1);
        
        // Show active trend text
        activeTrendText
          .text(`Currently viewing: ${d.title}`)
          .style('fill', colorScale(d.category) as string)
          .transition()
          .duration(200)
          .style('opacity', 1);
      })
      .on('mouseout', function() {
        // Reset all trends
        svg.selectAll('.trend-wave').style('opacity', 1);
        
        // Reset lines
        svg.selectAll('.trend-line')
          .transition()
          .duration(200)
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.8);
          
        // Reset glows
        svg.selectAll('.trend-line-glow')
          .transition()
          .duration(200)
          .attr('stroke-width', 4)
          .attr('opacity', 0.3);
          
        // Reset areas
        svg.selectAll('.trend-area')
          .transition()
          .duration(200)
          .attr('opacity', 0.2);
          
        // Reset legend
        legend.selectAll('.legend-row').style('opacity', 1);
        
        // Hide active trend text
        activeTrendText
          .transition()
          .duration(200)
          .style('opacity', 0);
      });

    // Add dots along the lines for better visibility
    trends.forEach((trend, trendIndex) => {
      const dotsGroup = svg
        .append('g')
        .attr('class', `trend-dots trend-dots-${trend.id}`);
        
      trend.data.forEach((point, i) => {
        dotsGroup
          .append('circle')
          .datum({ point, trend }) // Attach both point and trend data
          .attr('cx', xScale(point.date))
          .attr('cy', yScale(point.virality))
          .attr('r', 0)
          .attr('fill', colorScale(trend.category) as string)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.8)
          .style('cursor', 'pointer')
          .transition()
          .duration(300)
          .delay(trendIndex * 100 + i * 50 + 2000)
          .attr('r', 3);
      });
      
      // Add hover effect to dots
      dotsGroup.selectAll('circle')
        .on('mouseover', function(this: any, event: any, d: any) {
          const { point, trend } = d;
          
          // Highlight this trend
          svg.selectAll('.trend-wave').style('opacity', 0.3);
          svg.selectAll(`.trend-dots-${trend.id} circle`).attr('r', 5).attr('stroke-width', 2);
          
          // Find and highlight the corresponding trend line
          const trendGroup = svg.selectAll('.trend-wave')
            .filter((d: any) => d.id === trend.id);
          trendGroup.style('opacity', 1);
          trendGroup.select('.trend-line')
            .attr('stroke-width', 4)
            .attr('opacity', 1);
          trendGroup.select('.trend-line-glow')
            .attr('stroke-width', 6)
            .attr('opacity', 0.5);
          trendGroup.select('.trend-area')
            .attr('opacity', 0.4);
            
          // Highlight in legend
          legend.selectAll('.legend-row').style('opacity', 0.3);
          legend.select(`#legend-${trend.id}`).style('opacity', 1);
          
          // Show active trend text
          activeTrendText
            .text(`Currently viewing: ${trend.title}`)
            .style('fill', colorScale(trend.category) as string)
            .transition()
            .duration(200)
            .style('opacity', 1);
          
          // Show tooltip
          d3.selectAll('.timeline-tooltip').remove();
          
          const tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'timeline-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(15, 23, 42, 0.95)')
            .style('color', '#fff')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('border', '1px solid')
            .style('border-color', colorScale(trend.category) as string);

          tooltip
            .html(`
              <strong>${trend.title}</strong><br/>
              Virality: ${point.virality.toFixed(1)}%<br/>
              ${point.date.toLocaleDateString()}
            `)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .transition()
            .duration(200)
            .style('opacity', 1);
        })
        .on('mouseout', function() {
          // Reset
          svg.selectAll('.trend-wave').style('opacity', 1);
          svg.selectAll(`.trend-dots-${trend.id} circle`).attr('r', 3).attr('stroke-width', 1.5);
          
          svg.selectAll('.trend-line')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0.8);
          svg.selectAll('.trend-line-glow')
            .attr('stroke-width', 4)
            .attr('opacity', 0.3);
          svg.selectAll('.trend-area')
            .attr('opacity', 0.2);
            
          legend.selectAll('.legend-row').style('opacity', 1);
          d3.selectAll('.timeline-tooltip').remove();
          
          // Hide active trend text
          activeTrendText
            .transition()
            .duration(200)
            .style('opacity', 0);
        });
    });

    // Add peak indicators with animation
    trends.forEach((trend, index) => {
      const peakPoint = trend.data.reduce((max, point) => 
        point.virality > max.virality ? point : max
      );

      const circle = svg
        .append('circle')
        .attr('cx', xScale(peakPoint.date))
        .attr('cy', yScale(peakPoint.virality))
        .attr('r', 0)
        .attr('fill', colorScale(trend.category) as string)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');

      // Animate the circle
      circle
        .transition()
        .duration(500)
        .delay(index * 100 + 2000) // Appear after lines are drawn
        .attr('r', 6);

      // Add event handlers after transition
      circle
        .on('mouseover', function(event) {
          // Remove any existing tooltips
          d3.selectAll('.timeline-tooltip').remove();
          
          const tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'timeline-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(15, 23, 42, 0.95)')
            .style('color', '#fff')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0);

          tooltip
            .html(`
              <strong>${trend.title}</strong><br/>
              Peak: ${peakPoint.virality.toFixed(1)}% virality<br/>
              ${peakPoint.date.toLocaleDateString()}
            `)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`)
            .transition()
            .duration(200)
            .style('opacity', 1);

          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 8);
        })
        .on('mouseout', function() {
          d3.selectAll('.timeline-tooltip').remove();
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6);
        });
    });

    // Add axes
    const xAxis = svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(
        (d3.axisBottom(xScale)
          .tickFormat(d3.timeFormat('%b %d') as any)
          .ticks(d3.timeDay.every(1) as any) as any)
      );

    xAxis.selectAll('text')
      .style('fill', '#94a3b8')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');
    xAxis.selectAll('line').style('stroke', '#475569');
    xAxis.select('.domain').style('stroke', '#475569');

    const yAxis = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(
        (d3.axisLeft(yScale)
          .tickFormat(d => `${d}%`)
          .ticks(5) as any)
      );

    yAxis.selectAll('text').style('fill', '#94a3b8');
    yAxis.selectAll('line').style('stroke', '#475569');
    yAxis.select('.domain').style('stroke', '#475569');

    // Add axis labels
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', margin.left - 40)
      .attr('x', -(height / 2))
      .style('text-anchor', 'middle')
      .style('fill', '#94a3b8')
      .style('font-size', '14px')
      .text('Virality %');

    // Add legend with background
    const legendGroup = svg
      .append('g')
      .attr('transform', `translate(${width - margin.right + 10}, ${margin.top - 10})`);

    // Add legend background
    legendGroup
      .append('rect')
      .attr('x', -10)
      .attr('y', -10)
      .attr('width', 230)
      .attr('height', trends.length * 25 + 20)
      .attr('fill', '#0f172a')
      .attr('opacity', 0.8)
      .attr('rx', 8);

    const legend = legendGroup
      .append('g')
      .attr('transform', 'translate(0, 0)');

    // Add legend title
    legend
      .append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('fill', '#e2e8f0')
      .text('Trends');

    trends.forEach((trend, i) => {
      const legendRow = legend
        .append('g')
        .attr('class', 'legend-row')
        .attr('id', `legend-${trend.id}`)
        .attr('transform', `translate(0, ${i * 25 + 15})`)
        .style('cursor', 'pointer');

      // Add connecting line
      legendRow
        .append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', colorScale(trend.category) as string)
        .attr('stroke-width', 3);
        
      // Add circle to match dots on timeline
      legendRow
        .append('circle')
        .attr('cx', 25)
        .attr('cy', 0)
        .attr('r', 4)
        .attr('fill', colorScale(trend.category) as string)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      legendRow
        .append('text')
        .attr('x', 35)
        .attr('y', 4)
        .style('font-size', '11px')
        .style('fill', '#94a3b8')
        .text(trend.title.length > 20 ? trend.title.substring(0, 20) + '...' : trend.title);
        
      // Add hover interaction to legend
      legendRow
        .on('mouseover', function() {
          // Dim all trends
          svg.selectAll('.trend-wave').style('opacity', 0.3);
          svg.select(`.trend-wave:nth-child(${i + 1})`).style('opacity', 1);
          
          // Highlight all dots for this trend
          svg.selectAll(`.trend-dots-${trend.id} circle`)
            .transition()
            .duration(200)
            .attr('r', 5)
            .attr('stroke-width', 2)
            .attr('opacity', 1);
          
          // Dim other dots
          svg.selectAll(`.trend-dots:not(.trend-dots-${trend.id}) circle`)
            .transition()
            .duration(200)
            .attr('opacity', 0.3);
          
          // Highlight the specific trend line
          const trendGroup = svg.select(`.trend-wave:nth-child(${i + 1})`);
          trendGroup.select('.trend-line')
            .transition()
            .duration(200)
            .attr('stroke-width', 4)
            .attr('opacity', 1);
            
          trendGroup.select('.trend-line-glow')
            .transition()
            .duration(200)
            .attr('stroke-width', 6)
            .attr('opacity', 0.5);
            
          trendGroup.select('.trend-area')
            .transition()
            .duration(200)
            .attr('opacity', 0.4);
            
          // Dim other legend items
          legend.selectAll('.legend-row').style('opacity', 0.3);
          d3.select(this).style('opacity', 1);
          
          // Highlight circle in legend
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 6);
            
          // Show active trend text
          activeTrendText
            .text(`Currently viewing: ${trend.title}`)
            .style('fill', colorScale(trend.category) as string)
            .transition()
            .duration(200)
            .style('opacity', 1);
        })
        .on('mouseout', function() {
          // Reset everything
          svg.selectAll('.trend-wave').style('opacity', 1);
          
          // Reset all dots
          svg.selectAll('.trend-dots circle')
            .transition()
            .duration(200)
            .attr('r', 3)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.8);
          
          svg.selectAll('.trend-line')
            .transition()
            .duration(200)
            .attr('stroke-width', 2.5)
            .attr('opacity', 0.8);
            
          svg.selectAll('.trend-line-glow')
            .transition()
            .duration(200)
            .attr('stroke-width', 4)
            .attr('opacity', 0.3);
            
          svg.selectAll('.trend-area')
            .transition()
            .duration(200)
            .attr('opacity', 0.2);
            
          legend.selectAll('.legend-row').style('opacity', 1);
          
          // Reset circle in legend
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 4);
            
          // Hide active trend text
          activeTrendText
            .transition()
            .duration(200)
            .style('opacity', 0);
        });
    });

    // Cleanup tooltips on unmount
    return () => {
      d3.selectAll('.timeline-tooltip').remove();
    };
  }, [trends, dateRange]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}