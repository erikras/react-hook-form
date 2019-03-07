import { useRef, useState, useEffect } from 'react';
import getValidRadioValue from './getValidRadioValue';
import getFieldValues from './getFieldsValue';
import validateField from './validateField';
import getMultipleSelectValue from './getMultipleSelectValue';
import detectRegistered from './detectRegistered';

export interface RegisterInput {
  ref: any;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (any) => boolean;
  minLength?: number;
}

export default function useForm() {
  const fields = useRef({});
  const localErrorMessages = useRef({});
  const [errors, updateErrorMessage] = useState({});

  function validateWithStateUpdate(e: React.ChangeEvent<HTMLInputElement>) {
    const ref = fields.current[e.target.name];
    const error = validateField(ref, fields.current);

    if (!Object.keys(error).length) return;

    const copy = { ...localErrorMessages.current };
    delete copy[e.target.name];

    updateErrorMessage({ ...copy });
    localErrorMessages.current = { ...copy };
  }

  function register(data: any) {
    if (!data || !data.ref) return;
    if (!data.ref.name) {
      console.warn('Oops missing the name for field:', data.ref);
      return;
    }
    if (fields.current && fields[data.ref.name]) return;

    if (['text', 'email', 'password', 'search', 'tel', 'url'].includes(data.ref.type)) {
      data.ref.addEventListener('input', validateWithStateUpdate);
    } else {
      data.ref.addEventListener('change', validateWithStateUpdate);
    }
    if (!fields.current) fields.current = {};

    // if (data.ref.type === 'radio') {
    //   if (!fields.current[data.ref.name]) fields.current[data.ref.name] = [];
    //   fields.current[data.ref.name].push(data);
    // } else {
    fields.current[data.ref.name] = data;
    // }
  }

  function select(filedName?: string) {
    if (!fields.current) return null;
    const results = getFieldValues(fields.current, filedName);

    // if object need a good flat
    return typeof results === 'object' ? results : results;
  }

  const prepareSubmit = (callback: any) => (e: any) => {
    let localError = {};
    const values = {};
    e.preventDefault();

    Object.values(fields.current).forEach((data: any) => {
      const { ref } = data;
      // @ts-ignore:
      if (!document.body.contains(ref) && fields.current) {
        delete fields.current[ref.name];
        return;
      }

      // required section
      localError = validateField(data, fields.current, localError);

      if (localError[ref.name]) return;

      if (ref.type === 'checkbox') {
        values[ref.name] = ref.checked;
      } else if (ref.type === 'select-multiple') {
        values[ref.name] = getMultipleSelectValue([...ref.options]);
      } else if (ref.type === 'radio') {
        values[ref.name] = getValidRadioValue(fields.current, ref.name).value;
      } else {
        values[ref.name] = ref.value;
      }
    });

    updateErrorMessage({ ...localError });
    localErrorMessages.current = { ...localError };

    if (!Object.values(localError).length) callback(values);
  };

  useEffect(
    () => () =>
      Array.isArray(fields.current) &&
      Object.values(fields.current).forEach(({ ref }: any) => {
        ref.removeEventListener('blur', validateWithStateUpdate);
        ref.removeEventListener('input', validateWithStateUpdate);
        ref.removeEventListener('change', validateWithStateUpdate);
      }),
    [],
  );

  return {
    register,
    prepareSubmit,
    errors,
    select,
  };
}