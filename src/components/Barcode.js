import {Html5QrcodeScanner, Html5QrcodeScanType}  from 'html5-qrcode';
import {useEffect} from 'react';

export const ScanType = Html5QrcodeScanType; 

const id = "html5qr-code-full-region";

// Creates the configuration object for Html5QrcodeScanner.
const createConfig = (props) => {
    let config = {};
	if (props.supportedScanTypes) {
		config.supportedScanTypes = props.supportedScanTypes;
	}
    if (props.fps) {
        config.fps = props.fps;
    }
    if (props.qrbox) {
        config.qrbox = props.qrbox;
    }
    if (props.aspectRatio) {
        config.aspectRatio = props.aspectRatio;
    }
    if (props.disableFlip !== undefined) {
        config.disableFlip = props.disableFlip;
    }
    return config;
};

const Barcode = (props) => {

	useEffect(() => {
        const config = createConfig(props);
        const verbose = props.verbose === true;
        if (!props.qrCodeSuccessCallback) {
            throw "qrCodeSuccessCallback is required callback.";
        }
        const html5QrcodeScanner = new Html5QrcodeScanner(id, config, verbose);
        html5QrcodeScanner.render(props.qrCodeSuccessCallback, props.qrCodeErrorCallback);

        // cleanup function when component will unmount
        return () => {
            html5QrcodeScanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        };
    }, []);

    return (
        <div id={id} />
    );
};

export default Barcode;