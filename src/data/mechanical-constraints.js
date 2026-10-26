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
