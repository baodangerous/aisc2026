export const getCurrentPosition = (options?: PositionOptions) => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Thiết bị không hỗ trợ vị trí.'));
    return;
  }
  navigator.geolocation.getCurrentPosition(resolve, reject, options);
});

export const defaultLocationOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 30000,
};
