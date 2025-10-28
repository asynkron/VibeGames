import { BiPlaneFactory } from "./BiPlaneFactory.js";
import { DroneSpaceShipFactory } from "./DroneSpaceShipFactory.js";
import { FighterSpaceShipFactory } from "./FighterSpaceShipFactory.js";
import { FreightSpaceShipFactory } from "./FreightSpaceShipFactory.js";
import { ModernJetFactory } from "./ModernJetFactory.js";
import { TransportSpaceShipFactory } from "./TransportSpaceShipFactory.js";
import { WWIIFactory } from "./WWIIFactory.js";

export function createSpaceshipFactories() {
  return [
    new FighterSpaceShipFactory(),
    new FreightSpaceShipFactory(),
    new TransportSpaceShipFactory(),
    new DroneSpaceShipFactory(),
    new BiPlaneFactory(),
    new WWIIFactory(),
    new ModernJetFactory(),
  ];
}
