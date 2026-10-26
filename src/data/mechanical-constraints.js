export const IEC_132S_SPECS = {
  model: 'YE3-132S-4',
  shaftHeightM: 0.132,
  shaftDiameterM: 0.038,
  mountingType: 'IM_B3',
  couplingGapM: 0.003,
  anchorName: 'Anchor_Motor_Mount',
  // The main dossier Motor is authored with its shaft along the local X axis;
  // this is the yaw used when it is mounted in the application scene.
  mountYawRad: Math.PI / 2,
};

export const PADDY_PUMP_LAYOUT = {
  unit: 'meter',
  pumpType: 'horizontal_end_suction_centrifugal_pump',
  dutyFlowM3h: 90,
  dutyHeadM: 12,
  baseplateTopM: 0.219,
  anchors: {
    motorMount: 'Anchor_Motor_Mount',
    motorBase: 'Anchor_Motor_Base',
    baseplateTop: 'Anchor_Baseplate_TopSurface',
    pumpShaftCenter: 'Anchor_Pump_Shaft_Center',
    couplingCenter: 'Anchor_Coupling_Center',
    suctionCenterline: 'Anchor_Suction_Centerline',
    dischargeCenterline: 'Anchor_Discharge_Centerline',
  },
};
