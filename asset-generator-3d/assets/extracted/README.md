# Federation Interceptor HN48 – Extracted Components

This directory now offers modular building blocks for both the **landed** and **in-flight** variants of the Federation Interceptor HN48. Every OBJ file keeps its original material bindings so that textures from `Maps/` continue to work out of the box.

## Landed configuration

- `federation_interceptor_hn48_landed__body3.obj` – the main fuselage and wings (`o body3`).
- `federation_interceptor_hn48_landed__ship_landing_gear.obj` – the full landing gear assembly (`o ship landing gear`).
- `federation_interceptor_hn48_landed__landing_gear_doors.obj` – segmented doors that enclose the landing gear (`o landing gear doors`).
- `federation_interceptor_hn48_landed__ship_door.obj` – the side access door for the spacecraft (`o ship door`).

These meshes rely on `Federation_Interceptor_HN48_landed.mtl` plus the shared texture set in `Maps/`.

## Flying configuration

- `federation_interceptor_hn48_flying__body3.obj` – the flight-ready fuselage, wings, and engine block (`o body3`).
- `federation_interceptor_hn48_flying__ship_door.obj` – the closed side hatch geometry from the airborne pose (`o ship door`).

Both objects reference `Federation_Interceptor_HN48_flying.mtl`, which likewise expects textures from `Maps/`.

The original source OBJ files were removed after extraction, leaving these modular assets ready for kit-bashing new ships.
