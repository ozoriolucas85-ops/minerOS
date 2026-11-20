import { describe, it, expect } from 'vitest';
import {
  escaneosDe,
  estadoDePersona,
  estaSinSenal,
  ubicarPersonas,
  quienEstaAdentro,
  personasAdentro,
  personasEnGaleria,
  agruparPorGaleria,
  validarEscaneo,
} from '../src/domain/ubicacion.js';
import { ErrorDeValidacion, indexarPorId } from '../src/domain/utilidades.js';
import { crearSeed, CONFIG_POR_DEFECTO as config } from '../src/data/seed.js';

const seed = crearSeed({ ahora: 0 });
const nodosPorId = indexarPorId(seed.nodos);
const M = 60 * 1000;
const e = (nodoId, minuto, usuarioId = 'U1') => ({ usuarioId, nodoId, timestamp: minuto * M });

describe('estadoDePersona', () => {
  it('sin escaneos está afuera', () => {
    expect(estadoDePersona([], nodosPorId)).toEqual({ adentro: false, ultimo: null, entrada: null });
  });

  it('entra por la boca y baja', () => {
    const r = estadoDePersona([e('BOCA', 0), e('C1', 5), e('G1-P', 10)], nodosPorId);
    expect(r.adentro).toBe(true);
    expect(r.ultimo.nodoId).toBe('G1-P');
    expect(r.entrada.nodoId).toBe('BOCA');
  });

  it('escanear la boca recién llegado cuenta como adentro (en la boca)', () => {
    expect(estadoDePersona([e('BOCA', 0)], nodosPorId).adentro).toBe(true);
    expect(estadoDePersona([e('BOCA', 0), e('BOCA', 1)], nodosPorId).adentro).toBe(true);
  });

  it('salir por la boca vuelve la chapa a afuera', () => {
    expect(estadoDePersona([e('BOCA', 0), e('C1', 5), e('BOCA', 30)], nodosPorId).adentro).toBe(false);
  });

  it('el acopio es afuera; volver a entrar abre una visita nueva', () => {
    expect(estadoDePersona([e('C1', 0), e('BOCA', 5), e('ACOPIO', 6)], nodosPorId).adentro).toBe(false);
    const r = estadoDePersona([e('BOCA', 0), e('C1', 5), e('BOCA', 30), e('BOCA', 40), e('C1', 45)], nodosPorId);
    expect(r.adentro).toBe(true);
    expect(r.entrada.timestamp).toBe(40 * M);
  });

  it('un escaneo directo en un punto subterráneo cuenta como entrada', () => {
    const r = estadoDePersona([e('G3-F', 0)], nodosPorId);
    expect(r.adentro).toBe(true);
    expect(r.entrada.nodoId).toBe('G3-F');
  });

  it('el refugio es adentro', () => {
    expect(estadoDePersona([e('BOCA', 0), e('C1', 1), e('G1-P', 2), e('R1', 3)], nodosPorId).adentro).toBe(true);
  });

  it('ignora balizas desconocidas', () => {
    expect(estadoDePersona([e('X', 0)], nodosPorId).adentro).toBe(false);
  });
});

describe('sin señal', () => {
  it('más de 40 minutos (configurable) desde el último escaneo', () => {
    expect(estaSinSenal(0, 40 * M, 40)).toBe(false);
    expect(estaSinSenal(0, 40 * M + 1, 40)).toBe(true);
    expect(estaSinSenal(0, 20 * M + 1, 20)).toBe(true);
  });
});

describe('ubicarPersonas', () => {
  const usuarios = [{ id: 'U1' }, { id: 'U2' }, { id: 'U3' }];
  const escaneos = [
    e('BOCA', 0, 'U1'), e('C1', 5, 'U1'), e('G1-F', 10, 'U1'),
    e('BOCA', 0, 'U2'), e('C1', 5, 'U2'), e('C2', 50, 'U2'), e('G3-P', 60, 'U2'),
    e('BOCA', 0, 'U3'), e('C1', 5, 'U3'), e('BOCA', 20, 'U3'),
  ];
  const datos = { escaneos, usuarios, nodosPorId, ahora: 61 * M, config };
  const lista = ubicarPersonas(datos);

  it('ubica a cada persona con su galería y minutos desde el escaneo', () => {
    const u1 = lista.find((p) => p.usuario.id === 'U1');
    expect(u1).toMatchObject({ adentro: true, nodoId: 'G1-F', galeriaId: 'G1', minutosDesdeEscaneo: 51, sinSenal: true });
    const u2 = lista.find((p) => p.usuario.id === 'U2');
    expect(u2).toMatchObject({ adentro: true, galeriaId: 'G3', sinSenal: false });
    const u3 = lista.find((p) => p.usuario.id === 'U3');
    expect(u3).toMatchObject({ adentro: false, nodoId: null, galeriaId: null, sinSenal: false });
  });

  it('quién está adentro y cuántos', () => {
    expect(quienEstaAdentro(datos).map((p) => p.usuario.id)).toEqual(['U1', 'U2']);
    expect(personasAdentro(datos)).toBe(2);
  });

  it('personas en una galería y agrupación (null = rampas y cruces)', () => {
    expect(personasEnGaleria(lista, 'G3').map((p) => p.usuario.id)).toEqual(['U2']);
    const conCruce = ubicarPersonas({ ...datos, escaneos: [...escaneos, e('C1', 61, 'U3')] });
    const grupos = agruparPorGaleria(conCruce);
    expect([...grupos.keys()]).toEqual(['G1', 'G3', null]);
  });

  it('una persona sin escaneos está afuera y sin minutos', () => {
    const r = ubicarPersonas({ ...datos, usuarios: [{ id: 'nadie' }] });
    expect(r[0]).toMatchObject({ adentro: false, minutosDesdeEscaneo: null });
  });

  it('escaneosDe filtra y ordena', () => {
    expect(escaneosDe([e('C1', 5), e('BOCA', 0), e('C1', 1, 'otro')], 'U1').map((x) => x.nodoId)).toEqual(['BOCA', 'C1']);
  });
});

describe('validarEscaneo', () => {
  const galeriasPorId = indexarPorId(seed.galerias.map((g) => (g.id === 'G5' ? { ...g, bloqueada: true } : g)));

  it('acepta una baliza válida y devuelve el nodo', () => {
    expect(validarEscaneo({ nodoId: 'G3-F', nodosPorId, galeriasPorId }).id).toBe('G3-F');
    expect(validarEscaneo({ nodoId: 'BOCA', nodosPorId, galeriasPorId }).tipo).toBe('boca');
  });

  it('rechaza balizas de una galería bloqueada', () => {
    expect(() => validarEscaneo({ nodoId: 'G5-P', nodosPorId, galeriasPorId })).toThrow(/PELIGRO DE DERRUMBE/);
  });

  it('rechaza códigos desconocidos', () => {
    expect(() => validarEscaneo({ nodoId: 'ZZZ', nodosPorId, galeriasPorId })).toThrow(ErrorDeValidacion);
  });
});

describe('códigos QR', () => {
  it('genera y lee códigos de balizas y cargas', async () => {
    const { codigoDeBaliza, codigoQrDeCarga, leerCodigoQr } = await import('../src/domain/ubicacion.js');
    expect(codigoDeBaliza('G3-F')).toBe('CANARIO:BALIZA:G3-F');
    expect(leerCodigoQr(codigoDeBaliza('G3-F'))).toEqual({ tipo: 'baliza', valor: 'G3-F' });
    expect(leerCodigoQr(` ${codigoQrDeCarga('CAN-0042')} `)).toEqual({ tipo: 'carga', valor: 'CAN-0042' });
  });
  it('rechaza textos que no son de Canario', async () => {
    const { leerCodigoQr } = await import('../src/domain/ubicacion.js');
    expect(leerCodigoQr('https://ejemplo.com')).toBeNull();
    expect(leerCodigoQr('CANARIO:OTRA:X')).toBeNull();
    expect(leerCodigoQr('CANARIO:BALIZA:')).toBeNull();
    expect(leerCodigoQr(null)).toBeNull();
  });
});
