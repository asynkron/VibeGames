# Populus Sandbox

This version of **Populus** reuses the Battle Isle hexagonal terrain pipeline so the two projects share identical world generation and camera behaviour. The prototype keeps only the realtime exploration pieces—there are no turns, roads or units—making it a light-weight sandbox for experimenting with the hex map stack.

## Features

- Procedurally generated 48×48 hex grid driven by the same Perlin noise settings as Battle Isle.
- Smoothly blended vertex normals and shoreline foam to match the presentation of the turn-based game.
- Shared camera workflow: drag to pan, right-click to orbit and use the mouse wheel to zoom.
- Hover and click highlights for quickly inspecting terrain type and elevation.
- Minimap viewport for quick jumps across the island.

## Controls

- **Left drag** – pan across the terrain.
- **Right drag** – orbit around the current focus point.
- **Mouse wheel** – zoom in or out.
- **Left click** – lock a tile selection.
- **Minimap drag** – reposition the camera instantly.

## Development notes

The sandbox loads the same `TerrainSystem`, `GridSystem` and Perlin noise parameters as Battle Isle, but trims any dependencies on unit, road or AI systems. Common pieces—camera setup, minimap rendering and tile interaction—are split into small modules so new modes can mix and match systems as needed.
