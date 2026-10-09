import { SubscriptionsService } from './subscriptions.service';

describe('Subscription ownership and projection recovery',()=>{
  let service:SubscriptionsService, prisma:any,fs:any,redis:any,kamailio:any,prior:any,cache:any;
  const tenant={id:'tenant',customerCode:'U1001'};
  const resource={id:'did',number:'+15551234567',tenantId:'tenant',isActive:true,tenant};
  beforeEach(()=>{
    prior=null;
    prisma={dID:{findFirst:jest.fn().mockResolvedValue(resource),update:jest.fn()},
      $queryRawUnsafe:jest.fn(async()=>prior ? [prior]:[]),
      $executeRawUnsafe:jest.fn(async(sql,...args)=>{
        if(sql.startsWith('INSERT INTO subscription_asset_assignments'))prior={status:args[5],before_state:JSON.parse(args[6])};
        if(sql.startsWith('UPDATE subscription_asset_assignments'))prior.before_state={};
      })};
    fs={deleteDID:jest.fn(),syncDID:jest.fn()};redis={isOpen:true,del:jest.fn()};kamailio={};cache={flushDID:jest.fn()};
    service=new SubscriptionsService(prisma,{} as any,{get:jest.fn().mockReturnValue('test-token')} as any,fs,kamailio, {normalizeNumber:()=> '5551234567',updateNumberLookup:jest.fn()} as any,redis,cache);
  });
  it('rejects missing or wrong internal service credentials',()=>{
    expect(()=>service.authenticate('')).toThrow();expect(()=>service.authenticate('wrong')).toThrow();expect(()=>service.authenticate('test-token')).not.toThrow();
  });
  it('never selects a frozen or full subscription for an assignment',async()=>{
    jest.spyOn(service,'list').mockResolvedValue([
      {id:'frozen',status:'frozen',entitlement_snapshot:{numbers:10},usage:{numbers:0}},
      {id:'full',status:'active',entitlement_snapshot:{numbers:1},usage:{numbers:1}},
      {id:'available',status:'active',entitlement_snapshot:{numbers:2},usage:{numbers:1}},
    ]);
    await expect(service.capacity('tenant','numbers','frozen')).rejects.toThrow();
    await expect(service.capacity('tenant','numbers','full')).rejects.toThrow();
    expect((await service.capacity('tenant','numbers')).id).toBe('available');
  });
  it('rejects actions on another tenant subscription',async()=>{
    jest.spyOn(service,'list').mockResolvedValue([{id:'own',subscription_id:'SUB-OWN'}]);
    await expect(service.owned('tenant','foreign')).rejects.toThrow();
  });
  it('preserves pre-freeze state before a failed external deletion and retries safely',async()=>{
    const asset={id:'asset',type:'did',value:resource.number,status:'frozen'};
    fs.deleteDID.mockRejectedValueOnce(new Error('FreeSWITCH offline'));
    await expect((service as any).project('tenant',{id:'sub',status:'frozen'},asset)).rejects.toThrow('FreeSWITCH offline');
    expect(prior.before_state.isActive).toBe(true);
    prisma.dID.findFirst.mockResolvedValue({...resource,isActive:false});
    await (service as any).project('tenant',{id:'sub',status:'frozen'},asset);
    expect(prior.before_state.isActive).toBe(true);expect(redis.del).toHaveBeenCalled();
    await (service as any).project('tenant',{id:'sub',status:'active'},{...asset,status:'active'});
    expect(prisma.dID.update).toHaveBeenLastCalledWith({where:{id:'did'},data:{isActive:true}});
    expect(fs.syncDID).toHaveBeenCalled();expect(prior.before_state).toEqual({});
  });
  it('a frozen asset cannot be edited through routing endpoints',async()=>{
    prior={status:'frozen'};await expect(service.assertEditable('did','did')).rejects.toThrow('frozen');
  });
});
