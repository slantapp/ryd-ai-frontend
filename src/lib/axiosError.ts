/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from 'react-toastify';

export function handleAxiosError(error: any) {
  if (error.response) {
    // The error is an HTTP error with a response object.
    console.log('Error Status Code:', error.response.status);
    console.log('Error data ', error.response.data);
    console.log(error.response.status === 400);

    if (error.response.status === 400 || error.response.status === 409) {
      console.log(error.response.data.message);

      toast.error(`${error.response.data.message || error.response.message || error.response.data.data}`);
    } else if (error.response.status > 400 && error.response.status < 500) {
      let errorMessage = '';

      if (Array.isArray(error.response.data)) {
        const sanitizedData = error.response.data.map((item: any) => item.replace(/_/g, '').replace(/"/g, ''));
        // Join the sanitized array elements with line breaks
        errorMessage = sanitizedData.join('<br>');
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data.message.replace(/_/g, '').replace(/"/g, '');
      }

      toast.error(`${error.response.data.message || errorMessage}`);
    } else if (error.response.status === 500) {
      // toast.error("Network Error!");
      toast.error('Oops! an error has occurred please try again');
    }
  } else if (error.request) {
    toast.error('Checkout your network connection');
  } else {
    // The error is not related to the HTTP request.
    console.log('Request failed:', error.message);
    toast.error('Request failed');
  }
}
export function handleError(error: any) {
  toast.error(`${error}`);
}

export function showSuccess(message: any) {
  toast.success(`${message}`);
}
export function showError(message: any) {
  toast.error(`${message}`);
}
