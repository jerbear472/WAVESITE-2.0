import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Trend } from '@/types';

interface TrendRadarProps {
  data: Trend[];
}

export function TrendRadar({ data }: TrendRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Clean up any existing tooltips when component updates
    d3.selectAll('.trend-radar-tooltip').remove();
    d3.selectAll('.tooltip').remove();
    d3.selectAll('[class*="tooltip"]').remove();
    
    if (!svgRef.current || !data || !data.length) return;

    // Validate data
    const validData = data.filter(d => 
      d && 
      typeof d.viralityScore === 'number' && 
      typeof d.qualityScore === 'number' && 
      typeof d.validationCount === 'number' &&
      d.category &&
      d.title
    );

    if (!validData.length) return;

    const width = 800;
    const height = 600;
    const margin = { top: 80, right: 200, bottom: 80, left: 80 };

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

    // Add chart area background
    svg
      .append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', '#1e293b')
      .attr('opacity', 0.3)
      .attr('rx', 8);

    // Create scales with padding to prevent edge overlap
    const xScale = d3
      .scaleLinear()
      .domain([-5, 105]) // Add padding to domain
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([-0.5, 10.5]) // Add padding to domain
      .range([height - margin.bottom, margin.top]);

    // Create bubble size scale
    const sizeScale = d3
      .scaleSqrt()
      .domain([0, d3.max(validData, (d) => d.validationCount) || 100])
      .range([20, 60]);

    // Color scale for categories
    const colorScale = d3
      .scaleOrdinal()
      .domain(['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'])
      .range(['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444']);

    // Add grid lines
    const xGridLines = svg
      .append('g')
      .attr('class', 'grid x-grid')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat(() => '')
      );

    xGridLines.selectAll('line')
      .style('stroke', '#334155')
      .style('stroke-dasharray', '2,2')
      .style('opacity', 0.3);

    xGridLines.select('.domain').remove();

    const yGridLines = svg
      .append('g')
      .attr('class', 'grid y-grid')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(
        d3.axisLeft(yScale)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat(() => '')
      );

    yGridLines.selectAll('line')
      .style('stroke', '#334155')
      .style('stroke-dasharray', '2,2')
      .style('opacity', 0.3);

    yGridLines.select('.domain').remove();

    // Create bubbles
    const bubbles = svg
      .selectAll('g.bubble')
      .data(validData)
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
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Remove labels from bubbles - they'll show on hover only

    // Style axes
    const xAxis = svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale)
        .tickValues([0, 20, 40, 60, 80, 100])
        .tickFormat((d) => `${d}%`));
    
    xAxis.selectAll('text').style('fill', '#94a3b8');
    xAxis.selectAll('line').style('stroke', '#475569');
    xAxis.select('.domain').style('stroke', '#475569');
    
    xAxis
      .append('text')
      .attr('x', width / 2)
      .attr('y', 45)
      .attr('fill', '#94a3b8')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('text-anchor', 'middle')
      .text('Virality Potential →');

    const yAxis = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale)
        .tickValues([0, 2, 4, 6, 8, 10]));
    
    yAxis.selectAll('text').style('fill', '#94a3b8');
    yAxis.selectAll('line').style('stroke', '#475569');
    yAxis.select('.domain').style('stroke', '#475569');
    
    yAxis
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -35)
      .attr('x', -height / 2)
      .attr('fill', '#94a3b8')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .style('text-anchor', 'middle')
      .text('Quality Score ↑');

    // Add legend
    const legendData = [
      { category: 'visual_style', label: 'Visual Style' },
      { category: 'audio_music', label: 'Audio/Music' },
      { category: 'creator_technique', label: 'Creator Tech' },
      { category: 'meme_format', label: 'Meme Format' },
      { category: 'product_brand', label: 'Product/Brand' },
      { category: 'behavior_pattern', label: 'Behavior' }
    ];

    const legend = svg
      .append('g')
      .attr('transform', `translate(${width - margin.right + 40}, ${margin.top + 30})`);

    // Add legend title
    legend
      .append('text')
      .attr('y', -10)
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('fill', '#e2e8f0')
      .text('Categories');

    legendData.forEach((item, i) => {
      const legendRow = legend
        .append('g')
        .attr('transform', `translate(0, ${i * 22 + 10})`);

      legendRow
        .append('circle')
        .attr('r', 6)
        .attr('fill', colorScale(item.category) as string)
        .attr('opacity', 0.7);

      legendRow
        .append('text')
        .attr('x', 15)
        .attr('y', 4)
        .style('font-size', '11px')
        .style('fill', '#94a3b8')
        .text(item.label);
    });

    // Add metrics explanation
    const metricsInfo = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top - 50})`);

    // Quality Score explanation
    const qualityText = metricsInfo
      .append('text')
      .style('font-size', '12px')
      .style('fill', '#64748b');
    
    qualityText
      .append('tspan')
      .text('📊 ');
    
    qualityText
      .append('tspan')
      .style('font-weight', '600')
      .style('fill', '#94a3b8')
      .text('Quality Score: ');
    
    qualityText
      .append('tspan')
      .style('fill', '#64748b')
      .text('Content engagement & production value (0-10)');

    // Viral Potential explanation
    const viralText = metricsInfo
      .append('text')
      .attr('y', 18)
      .style('font-size', '12px')
      .style('fill', '#64748b');
    
    viralText
      .append('tspan')
      .text('🚀 ');
    
    viralText
      .append('tspan')
      .style('font-weight', '600')
      .style('fill', '#94a3b8')
      .text('Viral Potential: ');
    
    viralText
      .append('tspan')
      .style('fill', '#64748b')
      .text('Predicted reach & sharing likelihood (0-100%)');

    // Add bubble size explanation
    legend
      .append('text')
      .attr('y', legendData.length * 22 + 40)
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#e2e8f0')
      .text('Bubble Size');

    legend
      .append('text')
      .attr('y', legendData.length * 22 + 55)
      .style('font-size', '10px')
      .style('fill', '#94a3b8')
      .text('= Validations');

    // Add hover interactions - attach to circles directly
    bubbles.select('circle')
      .on('mouseover', function (event, d) {
        // Highlight the bubble
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke-width', 3);
        
        // Bring parent group to front
        d3.select(this.parentNode).raise();
        
        // Remove any existing tooltips first
        d3.selectAll('.trend-radar-tooltip').remove();
        
        // Show tooltip with unique ID
        const tooltipId = `tooltip-${Date.now()}-${Math.random()}`;
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'trend-radar-tooltip')
          .attr('id', tooltipId)
          .style('position', 'absolute')
          .style('background', 'rgba(15, 23, 42, 0.95)')
          .style('color', '#fff')
          .style('padding', '12px 16px')
          .style('border-radius', '8px')
          .style('border', '1px solid rgba(148, 163, 184, 0.2)')
          .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('z-index', 1000);

        const dateStr = d.createdAt ? (() => {
          try {
            const date = new Date(d.createdAt);
            return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Unknown';
          } catch {
            return 'Unknown';
          }
        })() : 'Unknown';

        const categoryColors = {
          'visual_style': '#8B5CF6',
          'audio_music': '#EC4899',
          'creator_technique': '#10B981',
          'meme_format': '#F59E0B',
          'product_brand': '#3B82F6',
          'behavior_pattern': '#EF4444'
        };

        tooltip
          .html(
            `<div style="margin-bottom: 8px;">
              <strong style="font-size: 14px;">${d.title}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="width: 8px; height: 8px; background: ${categoryColors[d.category] || '#666'}; border-radius: 50%; display: inline-block;"></span>
              <span style="color: #94a3b8; font-size: 12px;">${d.category.replace(/_/g, ' ')}</span>
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 12px;">
              <span style="color: #64748b;">Virality:</span>
              <span style="color: #e2e8f0; font-weight: 600;">${(d.viralityScore * 100).toFixed(0)}%</span>
              <span style="color: #64748b;">Quality:</span>
              <span style="color: #e2e8f0; font-weight: 600;">${(d.qualityScore * 10).toFixed(1)}/10</span>
              <span style="color: #64748b;">Validations:</span>
              <span style="color: #e2e8f0; font-weight: 600;">${d.validationCount}</span>
              <span style="color: #64748b;">First spotted:</span>
              <span style="color: #e2e8f0;">${dateStr}</span>
            </div>`
          );

        // Position tooltip with boundary checking
        const tooltipNode = tooltip.node();
        const tooltipWidth = 280; // Approximate width
        const tooltipHeight = 150; // Approximate height
        
        let left = event.pageX + 15;
        let top = event.pageY - 10;
        
        // Check right boundary
        if (left + tooltipWidth > window.innerWidth) {
          left = event.pageX - tooltipWidth - 15;
        }
        
        // Check bottom boundary
        if (top + tooltipHeight > window.innerHeight) {
          top = event.pageY - tooltipHeight - 10;
        }
        
        tooltip
          .style('left', `${left}px`)
          .style('top', `${top}px`)
          .transition()
          .duration(200)
          .style('opacity', 1);
      })
      .on('mouseout', function () {
        // Reset bubble
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.7)
          .attr('stroke-width', 2);
        
        // Remove tooltip with delay to prevent flicker
        setTimeout(() => {
          d3.selectAll('.trend-radar-tooltip').remove();
        }, 100);
      })
      .on('mousemove', function(event) {
        // Update tooltip position on mouse move with boundary checking
        const tooltip = d3.select('.trend-radar-tooltip');
        if (!tooltip.empty()) {
          const tooltipWidth = 280;
          const tooltipHeight = 150;
          
          let left = event.pageX + 15;
          let top = event.pageY - 10;
          
          if (left + tooltipWidth > window.innerWidth) {
            left = event.pageX - tooltipWidth - 15;
          }
          
          if (top + tooltipHeight > window.innerHeight) {
            top = event.pageY - tooltipHeight - 10;
          }
          
          tooltip
            .style('left', `${left}px`)
            .style('top', `${top}px`);
        }
      });

  }, [data]);

  // Cleanup on unmount and periodic cleanup
  useEffect(() => {
    // Periodic cleanup of orphaned tooltips
    const cleanupInterval = setInterval(() => {
      d3.selectAll('.trend-radar-tooltip').remove();
      d3.selectAll('.tooltip').remove();
      // Remove any divs that look like tooltips
      d3.selectAll('body > div').each(function() {
        const node = d3.select(this);
        const style = node.attr('style') || '';
        if (style.includes('position: absolute') && 
            (style.includes('background: rgba(0, 0, 0') || 
             style.includes('background: rgba(15, 23, 42'))) {
          node.remove();
        }
      });
    }, 1000);

    return () => {
      clearInterval(cleanupInterval);
      d3.selectAll('.trend-radar-tooltip').remove();
      d3.selectAll('.tooltip').remove();
    };
  }, []);

  return <svg ref={svgRef} className="w-full h-full" />;
}