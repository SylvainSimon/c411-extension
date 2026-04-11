import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

/**
 * Mixin SweetAlert2 personnalisé pour correspondre au design du C411 Moderation Center
 */
export const C411Swal = Swal.mixin({
    background: '#202124',
    color: '#e8eaed',
    width: '450px',
    confirmButtonColor: '#1a73e8',
    cancelButtonColor: '#3c4043',
    customClass: {
        popup: 'c411-swal-popup',
        title: 'c411-swal-title',
        htmlContainer: 'c411-swal-html',
        confirmButton: 'c411-swal-confirm',
        cancelButton: 'c411-swal-cancel',
        icon: 'c411-swal-icon'
    },
    buttonsStyling: true,
    heightAuto: false
});

// Injection du CSS pour peaufiner le design SweetAlert2
const style = document.createElement('style');
style.textContent = `
    .swal2-container {
        z-index: 2000000 !important;
    }
    .c411-swal-popup {
        width: 450px !important;
        max-width: 95vw !important;
        border: 1px solid #3c4043 !important;
        border-radius: 12px !important;
        box-shadow: 0 24px 64px rgba(0,0,0,0.5) !important;
        font-family: system-ui, -apple-system, sans-serif !important;
    }
    .c411-swal-title {
        color: #8ab4f8 !important;
        font-size: 1.25em !important;
        font-weight: 600 !important;
    }
    .c411-swal-html {
        color: #9aa0a6 !important;
        font-size: 0.95em !important;
        line-height: 1.5 !important;
    }
    .c411-swal-confirm {
        padding: 8px 24px !important;
        font-weight: bold !important;
        border-radius: 6px !important;
    }
    .c411-swal-cancel {
        padding: 8px 24px !important;
        font-weight: bold !important;
        border-radius: 6px !important;
        color: #e8eaed !important;
    }
    .swal2-icon.swal2-warning {
        border-color: #fdd663 !important;
        color: #fdd663 !important;
    }
    .swal2-icon.swal2-error {
        border-color: #f28b82 !important;
        color: #f28b82 !important;
    }
    .swal2-icon.swal2-success {
        border-color: #81c995 !important;
        color: #81c995 !important;
    }
    .swal2-icon.swal2-info {
        border-color: #8ab4f8 !important;
        color: #8ab4f8 !important;
    }
`;
document.head.appendChild(style);
