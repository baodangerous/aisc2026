export const getCurrentPosition = (options?: PositionOptions) => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    reject(new Error('Định vị chỉ hoạt động trên HTTPS hoặc localhost.'));
    return;
  }
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
